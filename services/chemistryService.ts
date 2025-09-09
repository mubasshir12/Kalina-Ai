import { MoleculeData } from '../types';

interface PubChemProperty {
    CID: number;
    MolecularFormula: string;
    MolecularWeight: string;
    IUPACName: string;
}

interface PubChemResponse {
    PropertyTable: {
        Properties: PubChemProperty[];
    };
}

/**
 * Fetches the PubChem Compound ID (CID) for a given molecule name.
 */
const getMoleculeCID = async (moleculeName: string): Promise<string> => {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(moleculeName)}/cids/JSON`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`PubChem CID search failed for "${moleculeName}" with status: ${response.status}`);
    }
    const data = await response.json();
    const cid = data?.IdentifierList?.CID?.[0];
    if (!cid) {
        throw new Error(`Could not find a PubChem Compound ID for "${moleculeName}".`);
    }
    return cid.toString();
};

/**
 * Fetches the 3D structure data in SDF format from PubChem using a CID.
 */
const fetchMoleculeSDF = async (cid: string): Promise<string> => {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch 3D SDF data for CID ${cid} with status: ${response.status}`);
    }
    const sdfData = await response.text();
    if (!sdfData || !sdfData.includes('V2000')) {
         throw new Error(`Invalid or empty SDF data received for CID ${cid}.`);
    }
    return sdfData;
};

/**
 * Fetches key properties of a molecule from PubChem using a CID.
 */
const fetchMoleculeProperties = async (cid: string): Promise<PubChemProperty | null> => {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Failed to fetch properties for CID ${cid}, status: ${response.status}`);
        return null; // Non-critical, so we can proceed without it
    }
    const data: PubChemResponse = await response.json();
    return data?.PropertyTable?.Properties?.[0] ?? null;
};

/**
 * Parses a string in SDF format into a structured MoleculeData object.
 */
export const parseSDF = (sdfData: string): Pick<MoleculeData, 'atoms' | 'bonds'> => {
    const lines = sdfData.split('\n');
    const atomCountLine = lines[3];
    if (!atomCountLine) throw new Error("Invalid SDF format: Missing header line.");

    const atomCount = parseInt(atomCountLine.substring(0, 3).trim(), 10);
    const bondCount = parseInt(atomCountLine.substring(3, 6).trim(), 10);

    if (isNaN(atomCount) || isNaN(bondCount)) {
        throw new Error("Invalid SDF format: Could not parse atom and bond counts.");
    }
    
    const atoms = [];
    const bonds = [];
    
    const atomBlockStart = 4;
    for (let i = 0; i < atomCount; i++) {
        const line = lines[atomBlockStart + i];
        if (!line) continue;
        const x = parseFloat(line.substring(0, 10).trim());
        const y = parseFloat(line.substring(10, 20).trim());
        const z = parseFloat(line.substring(20, 30).trim());
        const element = line.substring(31, 34).trim();
        atoms.push({ element, x, y, z });
    }

    const bondBlockStart = atomBlockStart + atomCount;
    for (let i = 0; i < bondCount; i++) {
        const line = lines[bondBlockStart + i];
        if (!line) continue;
        const from = parseInt(line.substring(0, 3).trim(), 10) - 1; // SDF is 1-indexed
        const to = parseInt(line.substring(3, 6).trim(), 10) - 1;   // SDF is 1-indexed
        const order = parseInt(line.substring(6, 9).trim(), 10);
        bonds.push({ from, to, order });
    }

    return { atoms, bonds };
};

/**
 * Main service function to get all molecule data (3D structure and properties).
 */
export const getMoleculeData = async (moleculeName: string): Promise<MoleculeData> => {
    const cid = await getMoleculeCID(moleculeName);
    
    // Fetch SDF and properties concurrently
    const [sdfData, properties] = await Promise.all([
        fetchMoleculeSDF(cid),
        fetchMoleculeProperties(cid)
    ]);

    const { atoms, bonds } = parseSDF(sdfData);

    return {
        atoms,
        bonds,
        molecularFormula: properties?.MolecularFormula,
        molecularWeight: properties?.MolecularWeight,
        iupacName: properties?.IUPACName
    };
};
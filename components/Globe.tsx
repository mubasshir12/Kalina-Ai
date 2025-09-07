
import React from 'react';

const AnimatedGradientBackground: React.FC = () => {
    return (
        <>
            <style>{`
                .gradient-bg {
                    width: 100vw;
                    height: 100vh;
                    position: absolute;
                    overflow: hidden;
                    background: #F9F6F2;
                    top: 0;
                    left: 0;
                }

                .gradients-container {
                    filter: blur(40px);
                    width: 100%;
                    height: 100%;
                }

                .g1, .g2, .g3, .g4, .g5 {
                    width: 30vw;
                    height: 30vw;
                    position: absolute;
                    border-radius: 100%;
                    mix-blend-mode: normal;
                    z-index: -1;
                    will-change: transform, opacity;
                }
                
                .g1 {
                    background: rgba(251, 191, 36, 0.4); /* amber-400 */
                    top: 5vh;
                    left: 5vw;
                    animation: move1 18s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
                }

                .g2 {
                    background: rgba(59, 130, 246, 0.25); /* blue-500 */
                    top: 60vh;
                    left: 10vw;
                     animation: move2 22s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
                }

                .g3 {
                    background: rgba(236, 72, 153, 0.25); /* pink-500 */
                    top: 30vh;
                    left: 70vw;
                    animation: move3 20s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
                }

                .g4 {
                    background: rgba(139, 92, 246, 0.2); /* violet-500 */
                    top: 70vh;
                    left: 60vw;
                    animation: move4 24s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
                }
                
                @keyframes move1 {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(10vw, 20vh) scale(1.2); }
                }

                @keyframes move2 {
                    0% { transform: translate(0, 0) scale(1.1); }
                    100% { transform: translate(20vw, -30vh) scale(0.9); }
                }

                @keyframes move3 {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(-15vw, 15vh) scale(1.3); }
                }
                
                @keyframes move4 {
                    0% { transform: translate(0, 0) scale(0.9); }
                    100% { transform: translate(-20vw, -25vh) scale(1.1); }
                }
            `}</style>
            <div className="gradient-bg">
                <div className="gradients-container">
                    <div className="g1"></div>
                    <div className="g2"></div>
                    <div className="g3"></div>
                    <div className="g4"></div>
                </div>
            </div>
        </>
    );
};

export default AnimatedGradientBackground;

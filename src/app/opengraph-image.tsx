import { ImageResponse } from 'next/og';

export const alt = 'Monocle';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: '#09090b',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '800px',
                        height: '800px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
                    }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
                    {/* Logo SVG equivalent to the Monocle icon */}
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="140"
                            height="140"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                        {/* Glint effect */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '20px',
                                left: '20px',
                                width: '32px',
                                height: '24px',
                                borderTop: '5px solid rgba(255, 255, 255, 0.6)',
                                borderLeft: '5px solid rgba(255, 255, 255, 0.6)',
                                borderTopLeftRadius: '100%',
                            }}
                        />
                        {/* Handle/Chain underline */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '-8px',
                                left: '20px',
                                width: '100px',
                                height: '8px',
                                backgroundColor: '#ffffff',
                                borderRadius: '9999px',
                            }}
                        />
                    </div>

                    <div
                        style={{
                            fontSize: '160px',
                            fontWeight: 900,
                            color: '#ffffff',
                            letterSpacing: '-0.05em',
                            marginLeft: '12px',
                        }}
                    >
                        Monocle.
                    </div>
                </div>

                <div
                    style={{
                        marginTop: '32px',
                        fontSize: '56px',
                        fontStyle: 'italic',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.6)',
                        letterSpacing: '-0.02em',
                    }}
                >
                    Focus, properly.
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}

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
                    {/* Logo Flat Icon */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '120px', height: '120px', marginTop: '10px' }}>
                        <div style={{
                            width: '85%',
                            height: '85%',
                            borderRadius: '50%',
                            border: '12px solid #ffffff',
                            position: 'relative',
                            display: 'flex'
                        }}>
                            {/* Glint effect */}
                            <div style={{
                                position: 'absolute',
                                top: '15px',
                                left: '15px',
                                width: '35%',
                                height: '35%',
                                borderTop: '6px solid rgba(255, 255, 255, 0.6)',
                                borderLeft: '6px solid rgba(255, 255, 255, 0.6)',
                                borderTopLeftRadius: '100%'
                            }} />
                        </div>
                        {/* Handle/Chain underline */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            width: '50%',
                            height: '10px',
                            backgroundColor: '#ffffff',
                            borderRadius: '9999px',
                        }} />
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
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.8)',
                        letterSpacing: '-0.02em',
                    }}
                >
                    The fancy focus app.
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}

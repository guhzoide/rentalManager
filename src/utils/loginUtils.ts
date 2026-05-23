export const LOGIN_STYLES = `
    /* ── Login page keyframes ── */
    @keyframes login-bg-shift {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    @keyframes login-orb-a {
        0%   { transform: translate(0px, 0px) scale(1); }
        33%  { transform: translate(60px, -80px) scale(1.15); }
        66%  { transform: translate(-40px, 40px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
    }

    @keyframes login-orb-b {
        0%   { transform: translate(0px, 0px) scale(1); }
        33%  { transform: translate(-70px, 50px) scale(1.2); }
        66%  { transform: translate(50px, -60px) scale(0.85); }
        100% { transform: translate(0px, 0px) scale(1); }
    }

    @keyframes login-orb-c {
        0%   { transform: translate(0px, 0px) scale(1); }
        50%  { transform: translate(30px, 80px) scale(1.1); }
        100% { transform: translate(0px, 0px) scale(1); }
    }

    @keyframes login-card-in {
        0% {
            opacity: 0;
            transform: translateY(32px) scale(0.96);
            filter: blur(4px);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
        }
    }

    @keyframes login-logo-in {
        0% {
            opacity: 0;
            transform: translateY(-16px) scale(0.8);
        }
        60% {
            transform: translateY(4px) scale(1.05);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @keyframes login-field-in {
        0%   { opacity: 0; transform: translateX(-12px); }
        100% { opacity: 1; transform: translateX(0); }
    }

    @keyframes login-bar-slide {
        from { transform: scaleX(0); }
        to   { transform: scaleX(1); }
    }

    @keyframes login-glow-pulse {
        0%, 100% { opacity: 0.6; }
        50%      { opacity: 1; }
    }

    @keyframes login-float {
        0%, 100% { transform: translateY(0px); }
        50%      { transform: translateY(-8px); }
    }

    /* ── Layout ── */
    .login-root {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        width: 100vw;
        padding: 24px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        background: var(--bg-primary);
    }

    /* Animated gradient layer */
    .login-bg-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            135deg,
            #0f1117 0%,
            #0d1829 25%,
            #0f1117 50%,
            #100d1f 75%,
            #0f1117 100%
        );
        background-size: 400% 400%;
        animation: login-bg-shift 12s ease infinite;
        z-index: 0;
    }

    /* Subtle dot grid */
    .login-bg-grid {
        position: absolute;
        inset: 0;
        background-image: radial-gradient(rgba(96,165,250,0.12) 1px, transparent 1px);
        background-size: 32px 32px;
        z-index: 1;
        mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
    }

    /* Floating orbs */
    .login-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(70px);
        pointer-events: none;
        z-index: 1;
    }

    .login-orb-a {
        width: 520px;
        height: 520px;
        background: radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%);
        top: -120px;
        right: -80px;
        animation: login-orb-a 18s ease-in-out infinite;
    }

    .login-orb-b {
        width: 440px;
        height: 440px;
        background: radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 70%);
        bottom: -100px;
        left: -60px;
        animation: login-orb-b 22s ease-in-out infinite;
    }

    .login-orb-c {
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%);
        top: 50%;
        left: 10%;
        animation: login-orb-c 26s ease-in-out infinite;
    }

    /* Card */
    .login-card {
        position: relative;
        z-index: 10;
        background: rgba(22, 27, 39, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(96,165,250,0.2);
        border-radius: 20px;
        padding: 44px 40px 36px;
        width: 100%;
        max-width: 420px;
        box-shadow:
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 24px 80px rgba(0,0,0,0.55),
            0 0 60px rgba(96,165,250,0.06);
        display: flex;
        flex-direction: column;
        gap: 24px;
        animation: login-card-in 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    /* Top gradient bar */
    .login-card-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #60a5fa, #8b5cf6, #34d399);
        border-radius: 20px 20px 0 0;
        animation: login-bar-slide 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
        transform-origin: left;
    }

    /* Logo */
    .login-logo {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        text-align: center;
    }

    .login-logo-icon {
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #60a5fa, #8b5cf6);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        box-shadow: 0 0 32px rgba(96,165,250,0.4), 0 8px 20px rgba(0,0,0,0.3);
        animation: login-logo-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both,
                   login-float 4s ease-in-out 1s infinite;
    }

    .login-logo-title {
        font-size: 22px;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -0.3px;
        margin: 0;
        animation: login-field-in 0.5s ease 0.35s backwards;
    }

    .login-logo-sub {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0;
        animation: login-field-in 0.5s ease 0.45s backwards;
    }

    /* Form fields */
    .login-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .login-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .login-field:nth-child(1) { animation: login-field-in 0.45s ease 0.5s both; }
    .login-field:nth-child(2) { animation: login-field-in 0.45s ease 0.6s both; }
    .login-field:nth-child(3) { animation: login-field-in 0.45s ease 0.7s both; }

    .login-label {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .login-input {
        padding: 10px 13px;
        background: rgba(15, 17, 23, 0.6);
        border: 1px solid rgba(96,165,250,0.2);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 14px;
        font-family: inherit;
        width: 100%;
        box-sizing: border-box;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        outline: none;
    }

    .login-input:focus {
        border-color: rgba(96,165,250,0.55);
        box-shadow: 0 0 0 3px rgba(96,165,250,0.12), 0 0 20px rgba(96,165,250,0.08);
    }

    .login-input::placeholder {
        color: var(--text-muted);
    }

    .login-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .login-input-wrap {
        position: relative;
    }

    .login-eye-btn {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        font-size: 16px;
        display: flex;
        align-items: center;
        padding: 0;
        transition: color 0.15s ease;
    }

    .login-eye-btn:hover {
        color: var(--text-secondary);
    }

    /* Submit button */
    .login-submit-wrap {
        animation: login-field-in 0.45s ease 0.75s backwards;
    }

    .login-btn {
        width: 100%;
        height: 44px;
        background: linear-gradient(135deg, #60a5fa, #8b5cf6);
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        box-shadow: 0 4px 20px rgba(96,165,250,0.3);
        position: relative;
        overflow: hidden;
    }

    .login-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0);
        transition: background 0.15s ease;
    }

    .login-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(96,165,250,0.45);
    }

    .login-btn:active:not(:disabled) {
        transform: translateY(0px) scale(0.98);
    }

    .login-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* Footer link */
    .login-footer {
        display: flex;
        justify-content: center;
        font-size: 13px;
        color: var(--text-muted);
        border-top: 1px solid rgba(96,165,250,0.1);
        padding-top: 16px;
        animation: login-field-in 0.45s ease 0.85s backwards;
    }

    .login-link {
        background: none;
        border: none;
        color: #60a5fa;
        font-weight: 600;
        cursor: pointer;
        padding-left: 6px;
        font-size: 13px;
        font-family: inherit;
        transition: color 0.15s ease;
        text-decoration: none;
    }

    .login-link:hover {
        color: #93c5fd;
        text-decoration: underline;
    }

    /* Loading dots */
    @keyframes login-dot-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40%           { transform: translateY(-5px); opacity: 1; }
    }
    .login-dots {
        display: inline-flex;
        gap: 4px;
        align-items: center;
        margin-left: 8px;
    }
    .login-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #fff;
        animation: login-dot-bounce 1.2s ease infinite;
    }
    .login-dot:nth-child(2) { animation-delay: 0.15s; }
    .login-dot:nth-child(3) { animation-delay: 0.30s; }
`;
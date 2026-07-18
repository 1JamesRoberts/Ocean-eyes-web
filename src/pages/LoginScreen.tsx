import type { MouseEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import { PhoneFrame } from '../components/shared/PhoneFrame';

interface LoginScreenProps {
  isLoading: boolean;
  isExiting: boolean;
  onSignIn: () => Promise<void>;
}

const preventPlaceholderNavigation: MouseEventHandler<HTMLAnchorElement> = (event) => {
  event.preventDefault();
};

const OceanEyesBrand = () => (
  <div className="flex flex-col items-center" aria-label="OceanEyes">
    <svg
      className="
        h-16 w-20
        drop-shadow-[0_8px_18px_color-mix(in_srgb,var(--color-turquoise)_24%,transparent)]
      "
      viewBox="0 0 96 76"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 39C22 20 48 12 75 25c6 3 11 7 15 12-9-4-18-6-27-6-18 0-34 8-45 23L10 39Z"
        stroke="var(--color-turquoise)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="49" cy="37" r="11" stroke="var(--color-turquoise)" strokeWidth="6" />
      <path
        d="M8 50c20 18 47 20 73 7 6-3 10-6 14-10-12 5-24 6-35 5-18-2-31-9-44-19"
        stroke="var(--color-sky-surge)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="78" cy="12" r="4" fill="var(--color-turquoise)" />
      <circle cx="88" cy="21" r="2.75" fill="var(--color-turquoise)" />
      <circle cx="85" cy="4" r="2" fill="var(--color-turquoise)" />
    </svg>
    <p className="
      mt-1 text-[35px] leading-none font-extrabold tracking-[-0.065em]
      text-white
    ">
      Ocean<span className="text-turquoise">Eyes</span>
    </p>
  </div>
);

const GoogleMark = () => (
  <svg className="size-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.55l3.35-2.62Z" />
    <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
  </svg>
);

export const LoginScreen = ({ isLoading, isExiting, onSignIn }: LoginScreenProps) => (
  <div className={`
    absolute inset-0 z-1000
    ${isExiting ? 'animate-login-exit' : `animate-login-enter`}
  `}>
    <PhoneFrame>
      <main
        id="main-content"
        className="
          shimmer isolate flex min-h-0 flex-1 bg-prussian-blue text-white
        "
      >
        <img
          src="/oceaneyes-login-aquarium.webp"
          alt=""
          className="absolute inset-0 -z-3 size-full object-cover"
        />
        <div
          className="absolute inset-0 -z-2 bg-prussian-blue/25"
          aria-hidden="true"
        />
        <div
          className="
            absolute inset-x-0 bottom-0 -z-1 h-2/5 bg-linear-to-t
            from-prussian-blue/75 to-transparent
          "
          aria-hidden="true"
        />

        <section
          className="
            flex min-h-full w-full flex-col items-center justify-center px-4
            pt-[max(1rem,env(safe-area-inset-top))]
            pb-[max(1.25rem,env(safe-area-inset-bottom))]
          "
          aria-labelledby="login-title"
        >
          <div className="
            glass-card-overlay w-full max-w-[345px] px-6 py-7 text-center
            shadow-[var(--shadow-glass),0_20px_60px_color-mix(in_srgb,var(--color-prussian-blue)_48%,transparent)]
          ">
            <OceanEyesBrand />

            <div className="mt-7">
              <h1 id="login-title" className="
                text-[27px] leading-[1.08] font-extrabold tracking-[-0.045em]
                text-white
              ">
                Smart aquarium monitoring
              </h1>
              <p className="mx-auto mt-3 max-w-[250px] type-body-muted-inverse">
                Track your aquarium with AI-powered insights.
              </p>
            </div>

            <button
              type="button"
              className="
                mt-7 flex min-h-14 w-full cursor-pointer items-center
                justify-center gap-3 rounded-(--glass-radius-inline) border
                border-white bg-white px-5 py-3 type-strong text-prussian-blue
                shadow-primary-glow transition-smooth
                hover:-translate-y-0.5 hover:shadow-primary-hover
                active:translate-y-0
                disabled:cursor-wait disabled:opacity-90
              "
              onClick={() => void onSignIn()}
              disabled={isLoading}
              aria-describedby="google-login-status"
            >
              {isLoading ? <LoaderCircle className="
                size-6 animate-spin text-pine-teal
              " aria-hidden="true" /> : <GoogleMark />}
              <span>{isLoading ? 'Connecting…' : 'Continue with Google'}</span>
            </button>
            <p id="google-login-status" className="sr-only" role="status" aria-live="polite">
              {isLoading ? 'Connecting to Google.' : ''}
            </p>
          </div>

          <p className="
            mt-5 max-w-[330px] px-3 text-center text-[12px] leading-relaxed
            font-medium text-white/80
          ">
            By continuing, you agree to our{' '}
            <a
              href="#privacy"
              className="
                rounded-sm font-semibold text-turquoise underline
                decoration-turquoise/55 underline-offset-2 transition-smooth
                hover:text-white
              "
              onClick={preventPlaceholderNavigation}
              aria-label="Privacy Policy (placeholder)"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="#terms"
              className="
                rounded-sm font-semibold text-turquoise underline
                decoration-turquoise/55 underline-offset-2 transition-smooth
                hover:text-white
              "
              onClick={preventPlaceholderNavigation}
              aria-label="Terms of Service (placeholder)"
            >
              Terms of Service
            </a>
          </p>
        </section>
      </main>
    </PhoneFrame>
  </div>
);


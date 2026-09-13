import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#d9d9d9] bg-white px-5 py-14 text-[#0c0c0c]">
      <div className="mx-auto grid max-w-[1124px] gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2 text-[18px] font-medium tracking-[-0.05em]">
            <span className="flex size-6 items-center justify-center rounded-md bg-[#c9ff4a] text-[11px] font-semibold text-[#0c0c0c]">
              A
            </span>
            Aegis
          </Link>
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-[#636363]">
            The trust layer between AI agents and their tools.
            Policy-based data minimization, MCP, and SDKs — so sensitive data never reaches the model.
          </p>
        </div>
        <div>
          <p className="text-[14px] font-medium">Product</p>
          <ul className="mt-3 space-y-2 text-[14px] text-[#636363]">
            <li>
              <Link href="/signin" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Command center ]
              </Link>
            </li>
            <li>
              <Link href="/playground" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Playground ]
              </Link>
            </li>
            <li>
              <Link href="/policies" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Policies ]
              </Link>
            </li>
            <li>
              <Link href="/audit" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Audit log ]
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[14px] font-medium">Platform</p>
          <ul className="mt-3 space-y-2 text-[14px] text-[#636363]">
            <li>
              <a href="#integrations" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Integrations ]
              </a>
            </li>
            <li>
              <a href="#security" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Security ]
              </a>
            </li>
            <li>
              <Link href="/apps" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Connect apps ]
              </Link>
            </li>
            <li>
              <Link href="/approvals" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Approvals ]
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[14px] font-medium">Company</p>
          <ul className="mt-3 space-y-2 text-[14px] text-[#636363]">
            <li>
              <a href="#use-cases" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Use cases ]
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ FAQ ]
              </a>
            </li>
            <li>
              <Link href="/signup" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Get started ]
              </Link>
            </li>
            <li>
              <Link href="/signin" className="hover:text-black hover:underline hover:underline-offset-[3px]">
                [ Sign in ]
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1124px] flex-col gap-2 border-t border-[#d9d9d9] pt-6 text-[12px] text-[#636363] sm:flex-row sm:justify-between">
        <span>© 2026 Aegis. All rights reserved.</span>
        <span>San Francisco · Built for teams putting agents into production.</span>
      </div>
    </footer>
  );
}

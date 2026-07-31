import { useAuth } from "@/hooks/use-auth";

const PHONE = "919472484052";
const MESSAGE = "Hi! I need help with my SMM panel order.";

export function WhatsAppFab() {
  const { user } = useAuth();
  if (!user) return null;

  const open = () => {
    const text = encodeURIComponent(MESSAGE);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);

    if (isMobile) {
      // Opens the WhatsApp app on phones (falls back to store/web if not installed)
      window.location.href = `https://wa.me/${PHONE}?text=${text}`;
      return;
    }

    // Desktop: try the installed desktop app, fall back to WhatsApp Web
    const started = Date.now();
    window.location.href = `whatsapp://send?phone=${PHONE}&text=${text}`;
    window.setTimeout(() => {
      if (Date.now() - started < 2500 && !document.hidden) {
        window.open(`https://web.whatsapp.com/send?phone=${PHONE}&text=${text}`, "_blank", "noopener");
      }
    }, 1200);
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-black/20 transition-transform hover:scale-105 active:scale-95"
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8 fill-white" aria-hidden="true">
        <path d="M16.02 3C8.84 3 3.02 8.82 3.02 16c0 2.29.6 4.44 1.65 6.3L3 29l6.9-1.62A12.94 12.94 0 0 0 16.02 29c7.18 0 13-5.82 13-13S23.2 3 16.02 3Zm0 23.6c-1.98 0-3.83-.55-5.4-1.5l-.39-.23-4.1.96.97-4-.25-.4A10.55 10.55 0 0 1 5.42 16c0-5.85 4.76-10.6 10.6-10.6 5.85 0 10.6 4.75 10.6 10.6s-4.75 10.6-10.6 10.6Zm6.02-7.93c-.32-.16-1.9-.94-2.2-1.05-.29-.11-.5-.16-.72.16-.21.32-.83 1.05-1.02 1.26-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.5.14-.66.16-.16.37-.42.56-.63.16-.19.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.74-.99-2.38-.26-.62-.53-.53-.72-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.06 1.3 3.27c.16.21 2.24 3.42 5.43 4.67 2.65 1.04 3.19.83 3.77.78.58-.05 1.87-.76 2.13-1.5.26-.74.26-1.37.19-1.5-.08-.13-.29-.21-.6-.37Z" />
      </svg>
    </button>
  );
}

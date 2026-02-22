/**
 * Board layout — full-screen, no chrome.
 * The whiteboard takes up the entire viewport.
 */
export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

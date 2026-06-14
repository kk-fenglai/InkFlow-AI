import SignatureFontsLoader from "@/components/SignatureFontsLoader";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignatureFontsLoader />
      {children}
    </>
  );
}

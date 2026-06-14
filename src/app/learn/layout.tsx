import SignatureFontsLoader from "@/components/SignatureFontsLoader";

export default function LearnLayout({
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

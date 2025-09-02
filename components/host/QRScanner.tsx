"use client";
import { Scanner } from "@yudiel/react-qr-scanner";

type Props = {
  onCode: (text: string) => void;
  onError?: (err: unknown) => void;
  className?: string;
};

export default function QRScanner({ onCode, onError, className }: Props) {
  return (
    <div className={`rounded-box border p-3 ${className ?? ""}`}>
      <Scanner
        constraints={{ facingMode: "environment" }}
        // Library prop is onScan (NOT onDecode)
        onScan={(detected: unknown) => {
          // Try to extract a string from various possible shapes
          let text = "";
          if (Array.isArray(detected) && detected.length) {
            const first = detected[0] as any;
            text = first?.rawValue ?? first?.value ?? first?.text ?? "";
          } else if (typeof detected === "string") {
            text = detected;
          } else if (detected && typeof detected === "object") {
            const obj = detected as any;
            text = obj?.rawValue ?? obj?.text ?? "";
          }
          if (text) onCode(String(text));
        }}
        onError={(err: unknown) => onError?.(err)}
        allowMultiple={false}
      />
    </div>
  );
}

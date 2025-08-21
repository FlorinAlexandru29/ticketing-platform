import crypto from "crypto";

export function generateNumericCode(length = 6): string {
  // cryptographically-strong digits
  let code = "";
  while (code.length < length) {
    const r = crypto.randomInt(0, 10); // 0..9
    code += String(r);
  }
  return code;
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
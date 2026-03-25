export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const x = String(r.result || '');
      const i = x.indexOf('base64,');
      resolve(i >= 0 ? x.slice(i + 7) : x);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

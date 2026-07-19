import { useEffect, useRef, useState } from "react";

// Small "⋮" dropdown for export/import actions on the class and semester
// page headers. Each item is either a plain action ({ label, onClick }) or
// a file-picker action ({ label, fileAccept, onFile }) rendered as a
// button-styled file input.
export default function ThreeDotMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="three-dot-menu" ref={ref}>
      <button
        type="button"
        className="three-dot-btn"
        onClick={() => setOpen((v) => !v)}
        title="More options"
      >
        ⋮
      </button>
      {open && (
        <div className="three-dot-dropdown">
          {items.map((item, i) =>
            item.fileAccept ? (
              <label key={i} className="three-dot-item three-dot-item-file">
                {item.label}
                <input
                  type="file"
                  accept={item.fileAccept}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    setOpen(false);
                    if (file) item.onFile(file);
                  }}
                />
              </label>
            ) : (
              <button
                key={i}
                type="button"
                className="three-dot-item"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

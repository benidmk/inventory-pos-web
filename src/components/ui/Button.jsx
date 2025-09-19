export default function Button({ className = "", children, ...rest }) {
  return (
    <button
      className={`px-4 py-2 rounded-xl shadow hover:shadow-md active:scale-[.99] transition border border-gray-200 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

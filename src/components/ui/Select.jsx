export default function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`px-3 py-2 rounded-xl border w-full border-gray-300 focus:outline-none focus:ring focus:ring-blue-200 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

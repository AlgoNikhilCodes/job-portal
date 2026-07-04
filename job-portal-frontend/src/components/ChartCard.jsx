const ChartCard = ({ title, description, loading, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
    <div className="mb-4">
      <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    {loading ? (
      <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
    ) : (
      <div>{children}</div>
    )}
  </div>
);

export default ChartCard;

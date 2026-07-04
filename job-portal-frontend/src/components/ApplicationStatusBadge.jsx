const styles = {
  Applied:     'bg-gray-100 text-gray-700',
  Shortlisted: 'bg-yellow-100 text-yellow-800',
  Accepted:    'bg-green-100 text-green-800',
  Rejected:    'bg-red-100 text-red-700',
};

const ApplicationStatusBadge = ({ status }) => (
  <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status] || styles.Applied}`}>
    {status}
  </span>
);

export default ApplicationStatusBadge;

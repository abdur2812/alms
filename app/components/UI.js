// Reusable UI Components

export function PageHeader({ title, subtitle, action, backLink }) {
  const Link = require("next/link").default;
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        {backLink && (
          <Link
            href={backLink}
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-2 transition-colors duration-200"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </Link>
        )}
        <h1 className="text-3xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, backLink }) {
  return (
    <div className="px-6 py-5 bg-linear-to-r from-gray-50 to-white border-b border-gray-100 rounded-t-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`px-6 py-6 ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
    secondary:
      "text-gray-700 bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 focus:ring-indigo-500 shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
    danger:
      "text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 focus:ring-red-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
    success:
      "text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  className = "",
  containerClassName = "",
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white ${error ? "border-red-500" : ""} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  error,
  children,
  className = "",
  containerClassName = "",
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white ${error ? "border-red-500" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default: "bg-gray-100 text-gray-800 border-gray-200",
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    primary: "bg-indigo-100 text-indigo-800 border-indigo-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Table({ children, className = "" }) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingSpinner({ size = "md" }) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div
        className={`animate-spin rounded-full ${sizes[size]} border-4 border-gray-200 border-t-indigo-600`}
      ></div>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white text-gray-900 rounded-2xl shadow-2xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {title && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
          )}

          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDangerous = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-300">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-all duration-200 ${
              isDangerous
                ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
            }`}
          >
            {isDangerous ? "Logout" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Dropdown({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = "Select an option...",
  error = "",
  required = false,
  disabled = false,
  className = "",
  onSearch = null, // Function to fetch more data when searching
}) {
  const [isOpen, setIsOpen] = require("react").useState(false);
  const [searchTerm, setSearchTerm] = require("react").useState("");
  const [hoveredIndex, setHoveredIndex] = require("react").useState(null);
  const [searchOptions, setSearchOptions] = require("react").useState([]);
  const dropdownRef = require("react").useRef(null);

  // Use search results if searching, otherwise use regular options limited to 3
  const displayOptions = searchTerm ? searchOptions : options.slice(0, 3);

  const selectedLabel = (searchTerm ? searchOptions : options).find(
    (opt) => opt.value === value,
  )?.label;

  // Close dropdown when clicking outside
  require("react").useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle search with debouncing
  require("react").useEffect(() => {
    if (searchTerm && onSearch) {
      const timeoutId = setTimeout(async () => {
        try {
          const results = await onSearch(searchTerm);
          setSearchOptions(results);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchOptions([]);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchOptions([]);
    }
  }, [searchTerm, onSearch]);

  const handleSelect = (optionValue) => {
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
    setSearchTerm("");
    setSearchOptions([]);
  };

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
        }
        @keyframes slide-in-right {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes dropdown-slide-down {
          from {
            opacity: 0;
            transform: translateY(-12px) scaleY(0.95);
            transform-origin: top;
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
            transform-origin: top;
          }
        }
        @keyframes dropdown-item-fade {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .dropdown-glow {
          animation: pulse-glow 2s infinite;
        }
        .slide-in {
          animation: slide-in-right 0.3s ease-out;
        }
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
        .dropdown-menu {
          animation: dropdown-slide-down 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dropdown-item {
          animation: dropdown-item-fade 0.4s ease-out;
        }
      `}</style>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-4 py-3 bg-white border-2 rounded-xl transition-all duration-500 flex items-center justify-between font-medium text-gray-900 relative overflow-hidden ${
            isOpen ? "dropdown-glow" : ""
          } ${
            disabled
              ? "bg-gray-100 cursor-not-allowed opacity-60"
              : "hover:border-indigo-400 hover:shadow-lg hover:-translate-y-0.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 active:scale-95"
          } ${
            error
              ? "border-red-500 focus:ring-red-200 focus:border-red-500"
              : "border-gray-200"
          }`}
        >
          {!disabled && isOpen && (
            <div className="absolute inset-0 shimmer-effect pointer-events-none"></div>
          )}
          <span
            className={`${selectedLabel ? "text-gray-900" : "text-gray-500"} relative z-10`}
          >
            {selectedLabel || placeholder}
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transition-all duration-300 relative z-10 ${
              isOpen ? "rotate-180 scale-110" : "group-hover:scale-105"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute z-50 w-full mt-3 bg-white border-2 border-indigo-200 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm"
            style={{
              animation: "dropdownSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <style jsx>{`
              @keyframes dropdownSlide {
                from {
                  opacity: 0;
                  transform: translateY(-12px) scaleY(0.9);
                  transform-origin: top;
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scaleY(1);
                  transform-origin: top;
                }
              }
              @keyframes itemFade {
                from {
                  opacity: 0;
                  transform: translateX(-8px);
                }
                to {
                  opacity: 1;
                  transform: translateX(0);
                }
              }
            `}</style>
            {(options.length > 3 || searchTerm) && (
              <div className="px-3 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border-2 border-indigo-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-400 placeholder-gray-400"
                />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {displayOptions.length > 0 ? (
                displayOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-all duration-500 flex items-center justify-between group relative overflow-hidden ${
                      value === option.value
                        ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white shadow-lg"
                        : hoveredIndex === index
                          ? "bg-gradient-to-r from-indigo-100 via-purple-100 to-indigo-100 text-indigo-900"
                          : "text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{
                      animation: `itemFade 0.3s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    {hoveredIndex === index && !value && (
                      <div className="absolute inset-0 shimmer-effect"></div>
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {hoveredIndex === index && !value && (
                        <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                      )}
                      {option.label}
                    </span>
                    {value === option.value && (
                      <svg
                        className="h-5 w-5 text-white animate-bounce relative z-10 slide-in"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}

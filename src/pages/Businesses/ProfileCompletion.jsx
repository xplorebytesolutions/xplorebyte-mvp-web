import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function ProfileCompletion() {
  const navigate = useNavigate();
  const businessId = localStorage.getItem("businessId");

  const [form, setForm] = useState({
    companyName: "",
    representativeName: "",
    phone: "",
    companyPhone: "",
    country: "",
    website: "",
    address: "",
    industry: "",
    logoUrl: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Validation rules (unchanged)
  const fields = [
    [
      "Company Name",
      "companyName",
      "text",
      { required: true, minLength: 2, maxLength: 150 },
    ],
    [
      "Representative Name",
      "representativeName",
      "text",
      { required: true, minLength: 2, maxLength: 100 },
    ],
    [
      "Phone",
      "phone",
      "text",
      {
        required: true,
        pattern: /^\d{1,10}$/,
        title: "Enter a valid phone number (up to 10 digits)",
      },
    ],
    [
      "Company Phone",
      "companyPhone",
      "text",
      {
        required: true,
        pattern: /^\d{1,10}$/,
        title: "Enter a valid company phone number (up to 10 digits)",
      },
    ],
    ["Country", "country", "text", { required: false, maxLength: 100 }],
    [
      "Website",
      "website",
      "text",
      {
        required: false,
        pattern: /^www\..*/,
        title: "Website should start with www.",
      },
    ],
    ["Address", "address", "text", { required: false, maxLength: 250 }],
    ["Industry", "industry", "text", { required: false, maxLength: 100 }],
    [
      "Logo URL",
      "logoUrl",
      "text",
      {
        required: false,
        pattern: /^(https?:\/\/)?([\w-]+\.)+[\w-]+.*$/,
        title: "Enter a valid URL",
      },
    ],
  ];

  useEffect(() => {
    if (!businessId) return;

    fetch(`${API_BASE}/businesses/${businessId}`)
      .then(res =>
        res.ok ? res.json() : Promise.reject("Failed to fetch profile")
      )
      .then(data => {
        setForm({
          companyName: data.companyName ?? data.businessName ?? "",
          representativeName: data.representativeName ?? "",
          phone: data.phone ?? "",
          companyPhone: data.companyPhone ?? "",
          country: data.country ?? "",
          website: data.website ?? "",
          address: data.address ?? "",
          industry: data.industry ?? "",
          logoUrl: data.logoUrl ?? "",
        });
      })
      .catch(err => {
        console.error("❌ Fetch error:", err);
        toast.error("❌ Failed to load profile.");
      });
  }, [businessId]);

  const validateField = (name, value) => {
    const field = fields.find(f => f[1] === name);
    if (!field) return null;
    const validation = field[3];

    if (validation.required && !String(value || "").trim()) {
      return `${field[0]} is required.`;
    }
    if (validation.minLength && value.length < validation.minLength) {
      return `${field[0]} must be at least ${validation.minLength} characters.`;
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      return `${field[0]} cannot exceed ${validation.maxLength} characters.`;
    }
    if (
      validation.pattern &&
      String(value || "").length > 0 &&
      !validation.pattern.test(value)
    ) {
      return validation.title || `${field[0]} is invalid.`;
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    fields.forEach(([_, name]) => {
      const error = validateField(name, form[name]);
      if (error) newErrors[name] = error;
    });
    return newErrors;
  };

  const handleChange = e => {
    const { name, value } = e.target;

    // Only digits for phone fields
    if (
      (name === "phone" || name === "companyPhone") &&
      value &&
      !/^\d*$/.test(value)
    ) {
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = e => {
    e.preventDefault();

    const formErrors = validateForm();
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      toast.error("Please fix validation errors before submitting.");
      return;
    }

    setLoading(true);

    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [
        k,
        typeof v === "string" ? v.trim() : v,
      ])
    );

    fetch(`${API_BASE}/businesses/profile-completion/${businessId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(res => (res.ok ? res.json() : Promise.reject("Update failed")))
      .then(() => {
        toast.success("✅ Profile updated successfully!");
        setTimeout(() => navigate("/app/crm"), 800);
      })
      .catch(err => {
        console.error("❌ Submit error:", err);
        toast.error("❌ Failed to update profile.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-8 md:py-8">
      {/* Page header */}
      <div className="max-w-5xl mx-auto mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-emerald-800">
              🧩 Profile & Business Details
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Complete your business profile so messaging, campaigns, and
              analytics can use your latest company information.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Recommended setup step
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {/* top gradient bar */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-purple-500 to-sky-500" />

          <form
            onSubmit={handleSubmit}
            className="p-4 md:p-6 lg:p-8"
            noValidate
          >
            {/* subsection heading */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Business profile
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                These details help personalise templates, invoices, and campaign
                messages for your brand.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {fields.map(([label, name, type]) => (
                <div key={name}>
                  <label
                    htmlFor={name}
                    className="text-xs font-medium text-slate-600 block mb-1.5"
                  >
                    {label}
                  </label>
                  <input
                    id={name}
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    className={`w-full px-3 py-2 rounded-md text-sm border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition ${
                      errors[name] ? "border-red-500" : "border-slate-300"
                    }`}
                    aria-invalid={errors[name] ? "true" : "false"}
                    aria-describedby={`${name}-error`}
                  />
                  {errors[name] && (
                    <p
                      className="text-red-600 text-xs mt-1"
                      id={`${name}-error`}
                      role="alert"
                    >
                      {errors[name]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                You can update these details later from{" "}
                <span className="font-semibold text-slate-700">
                  Settings → Profile Update
                </span>
                .
              </p>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-5 py-2.5 rounded-md text-sm font-semibold text-white shadow-sm transition ${
                  loading
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {loading ? "🔄 Saving profile…" : "✅ Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { toast } from "react-toastify";
// import { useNavigate } from "react-router-dom";

// const API_BASE = process.env.REACT_APP_API_BASE_URL;

// export default function ProfileCompletion() {
//   const navigate = useNavigate();
//   const businessId = localStorage.getItem("businessId");

//   const [form, setForm] = useState({
//     companyName: "", // ✅ NEW
//     representativeName: "",
//     phone: "",
//     companyPhone: "",
//     country: "",
//     website: "",
//     address: "",
//     industry: "",
//     logoUrl: "",
//   });

//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);

//   // Validation rules (added Company Name)
//   const fields = [
//     [
//       "Company Name",
//       "companyName",
//       "text",
//       { required: true, minLength: 2, maxLength: 150 },
//     ], // ✅ NEW
//     [
//       "Representative Name",
//       "representativeName",
//       "text",
//       { required: true, minLength: 2, maxLength: 100 },
//     ],
//     [
//       "Phone",
//       "phone",
//       "text",
//       {
//         required: true,
//         pattern: /^\d{1,10}$/,
//         title: "Enter a valid phone number (up to 10 digits)",
//       },
//     ],
//     [
//       "Company Phone",
//       "companyPhone",
//       "text",
//       {
//         required: true,
//         pattern: /^\d{1,10}$/,
//         title: "Enter a valid company phone number (up to 10 digits)",
//       },
//     ],
//     ["Country", "country", "text", { required: false, maxLength: 100 }],
//     [
//       "Website",
//       "website",
//       "text",
//       {
//         required: false,
//         pattern: /^www\..*/,
//         title: "Website should start with www.",
//       },
//     ],
//     ["Address", "address", "text", { required: false, maxLength: 250 }],
//     ["Industry", "industry", "text", { required: false, maxLength: 100 }],
//     [
//       "Logo URL",
//       "logoUrl",
//       "text",
//       {
//         required: false,
//         pattern: /^(https?:\/\/)?([\w-]+\.)+[\w-]+.*$/,
//         title: "Enter a valid URL",
//       },
//     ],
//   ];

//   useEffect(() => {
//     if (!businessId) return;

//     fetch(`${API_BASE}/businesses/${businessId}`)
//       .then(res =>
//         res.ok ? res.json() : Promise.reject("Failed to fetch profile")
//       )
//       .then(data => {
//         // Prefill. Use CompanyName or BusinessName if present.
//         setForm({
//           companyName: data.companyName ?? data.businessName ?? "", // ✅ NEW
//           representativeName: data.representativeName ?? "",
//           phone: data.phone ?? "",
//           companyPhone: data.companyPhone ?? "",
//           country: data.country ?? "",
//           website: data.website ?? "",
//           address: data.address ?? "",
//           industry: data.industry ?? "",
//           logoUrl: data.logoUrl ?? "",
//         });
//       })
//       .catch(err => {
//         console.error("❌ Fetch error:", err);
//         toast.error("❌ Failed to load profile.");
//       });
//   }, [API_BASE, businessId]);

//   const validateField = (name, value) => {
//     const field = fields.find(f => f[1] === name);
//     if (!field) return null;
//     const validation = field[3];

//     if (validation.required && !String(value || "").trim()) {
//       return `${field[0]} is required.`;
//     }
//     if (validation.minLength && value.length < validation.minLength) {
//       return `${field[0]} must be at least ${validation.minLength} characters.`;
//     }
//     if (validation.maxLength && value.length > validation.maxLength) {
//       return `${field[0]} cannot exceed ${validation.maxLength} characters.`;
//     }
//     if (
//       validation.pattern &&
//       String(value || "").length > 0 &&
//       !validation.pattern.test(value)
//     ) {
//       return validation.title || `${field[0]} is invalid.`;
//     }
//     return null;
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     fields.forEach(([_, name]) => {
//       const error = validateField(name, form[name]);
//       if (error) newErrors[name] = error;
//     });
//     return newErrors;
//   };

//   const handleChange = e => {
//     const { name, value } = e.target;

//     // Only digits for phone fields
//     if (
//       (name === "phone" || name === "companyPhone") &&
//       value &&
//       !/^\d*$/.test(value)
//     ) {
//       return;
//     }

//     setForm(prev => ({ ...prev, [name]: value }));
//     setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
//   };

//   const handleSubmit = e => {
//     e.preventDefault();

//     const formErrors = validateForm();
//     setErrors(formErrors);
//     if (Object.keys(formErrors).length > 0) {
//       toast.error("Please fix validation errors before submitting.");
//       return;
//     }

//     setLoading(true);

//     // Trim strings before sending
//     const payload = Object.fromEntries(
//       Object.entries(form).map(([k, v]) => [
//         k,
//         typeof v === "string" ? v.trim() : v,
//       ])
//     );

//     fetch(`${API_BASE}/businesses/profile-completion/${businessId}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     })
//       .then(res => (res.ok ? res.json() : Promise.reject("Update failed")))
//       .then(() => {
//         toast.success("✅ Profile updated successfully!");
//         setTimeout(() => navigate("/app/crm"), 800);
//       })
//       .catch(err => {
//         console.error("❌ Submit error:", err);
//         toast.error("❌ Failed to update profile.");
//       })
//       .finally(() => setLoading(false));
//   };

//   return (
//     <div className="min-h-screen flex items-start justify-center bg-gray-50 px-0 pt-2">
//       <form
//         onSubmit={handleSubmit}
//         className="bg-white shadow-sm border rounded-md w-full max-w-4xl p-4 md:p-6 hover:shadow-md transition"
//         noValidate
//       >
//         <h2 className="text-lg font-bold text-purple-700 mb-6">
//           📝 Complete Your Business Profile
//         </h2>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
//           {fields.map(([label, name, type]) => (
//             <div key={name}>
//               <label
//                 htmlFor={name}
//                 className="text-xs font-medium text-gray-600 block mb-1"
//               >
//                 {label}
//               </label>
//               <input
//                 id={name}
//                 type={type}
//                 name={name}
//                 value={form[name]}
//                 onChange={handleChange}
//                 placeholder={`Enter ${label.toLowerCase()}`}
//                 className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
//                   errors[name] ? "border-red-500" : "border-gray-300"
//                 }`}
//                 aria-invalid={errors[name] ? "true" : "false"}
//                 aria-describedby={`${name}-error`}
//               />
//               {errors[name] && (
//                 <p
//                   className="text-red-600 text-xs mt-1"
//                   id={`${name}-error`}
//                   role="alert"
//                 >
//                   {errors[name]}
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>

//         <div className="pt-6 border-t mt-6 flex justify-end">
//           <button
//             type="submit"
//             disabled={loading}
//             className={`inline-flex items-center px-5 py-2 rounded-md text-white text-sm font-medium transition ${
//               loading
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-purple-600 hover:bg-purple-700"
//             }`}
//           >
//             {loading ? "🔄 Submitting..." : "✅ Submit Profile"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

// import { useState, useEffect } from "react";
// import { toast } from "react-toastify";
// import { useNavigate } from "react-router-dom";

// const API_BASE = process.env.REACT_APP_API_BASE_URL;

// export default function ProfileCompletion() {
//   const navigate = useNavigate();
//   const businessId = localStorage.getItem("businessId");

//   const [form, setForm] = useState({
//     representativeName: "",
//     phone: "",
//     companyPhone: "",
//     country: "",
//     website: "",
//     address: "",
//     industry: "",
//     logoUrl: "",
//   });

//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);

//   // Validation rules from your fields array
//   const fields = [
//     [
//       "Representative Name",
//       "representativeName",
//       "text",
//       { required: true, minLength: 2, maxLength: 100 },
//     ],
//     [
//       "Phone",
//       "phone",
//       "text",
//       {
//         required: true,
//         pattern: /^\d{1,10}$/,
//         title: "Enter a valid phone number (up to 10 digits)",
//       },
//     ],
//     [
//       "Company Phone",
//       "companyPhone",
//       "text",
//       {
//         required: true,
//         pattern: /^\d{1,10}$/,
//         title: "Enter a valid company phone number (up to 10 digits)",
//       },
//     ],
//     ["Country", "country", "text", { required: false, maxLength: 100 }],
//     [
//       "Website",
//       "website",
//       "text",
//       {
//         required: false,
//         pattern: /^www\..*/,
//         title: "Website should start with www.",
//       },
//     ],
//     ["Address", "address", "text", { required: false, maxLength: 250 }],
//     ["Industry", "industry", "text", { required: false, maxLength: 100 }],
//     [
//       "Logo URL",
//       "logoUrl",
//       "text",
//       {
//         required: false,
//         pattern: /^(https?:\/\/)?([\w-]+\.)+[\w-]+.*$/,
//         title: "Enter a valid URL",
//       },
//     ],
//   ];

//   useEffect(() => {
//     if (!businessId) return;

//     fetch(`${API_BASE}/businesses/${businessId}`)
//       .then(res =>
//         res.ok ? res.json() : Promise.reject("Failed to fetch profile")
//       )
//       .then(data => {
//         console.log("✅ Profile fetched:", data);
//         setForm({
//           representativeName: data.representativeName ?? "",
//           phone: data.phone ?? "",
//           companyPhone: data.companyPhone ?? "",
//           country: data.country ?? "",
//           website: data.website ?? "",
//           address: data.address ?? "",
//           industry: data.industry ?? "",
//           logoUrl: data.logoUrl ?? "",
//         });
//       })
//       .catch(err => {
//         console.error("❌ Fetch error:", err);
//         toast.error("❌ Failed to load profile.");
//       });
//   }, [businessId]);

//   // Validate single field
//   const validateField = (name, value) => {
//     const field = fields.find(f => f[1] === name);
//     if (!field) return null;

//     const validation = field[3];

//     if (validation.required && !value.trim()) {
//       return `${field[0]} is required.`;
//     }

//     if (validation.minLength && value.length < validation.minLength) {
//       return `${field[0]} must be at least ${validation.minLength} characters.`;
//     }

//     if (validation.maxLength && value.length > validation.maxLength) {
//       return `${field[0]} cannot exceed ${validation.maxLength} characters.`;
//     }

//     if (validation.pattern && !validation.pattern.test(value)) {
//       return validation.title || `${field[0]} is invalid.`;
//     }

//     return null;
//   };

//   // Validate all fields, returns errors object
//   const validateForm = () => {
//     const newErrors = {};
//     fields.forEach(([label, name]) => {
//       const error = validateField(name, form[name]);
//       if (error) newErrors[name] = error;
//     });
//     return newErrors;
//   };

//   const handleChange = e => {
//     const { name, value } = e.target;

//     // For phone inputs, allow only digits:
//     if (name === "phone" || name === "companyPhone") {
//       if (value && !/^\d*$/.test(value)) return; // ignore non-digit input
//     }

//     setForm(prev => ({ ...prev, [name]: value }));

//     // Validate on change
//     const error = validateField(name, value);
//     setErrors(prev => ({ ...prev, [name]: error }));
//   };

//   const handleSubmit = e => {
//     e.preventDefault();

//     const formErrors = validateForm();
//     setErrors(formErrors);

//     if (Object.keys(formErrors).length > 0) {
//       toast.error("Please fix validation errors before submitting.");
//       return;
//     }

//     setLoading(true);

//     fetch(`${API_BASE}/businesses/profile-completion/${businessId}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(form),
//     })
//       .then(res => (res.ok ? res.json() : Promise.reject("Update failed")))
//       .then(() => {
//         toast.success("✅ Profile updated successfully!");
//         setTimeout(() => navigate("/app/crm"), 1000);
//       })
//       .catch(err => {
//         console.error("❌ Submit error:", err);
//         toast.error("❌ Failed to update profile.");
//       })
//       .finally(() => setLoading(false));
//   };

//   return (
//     <div className="min-h-screen flex items-start justify-center bg-gray-50 px-0 pt-2">
//       <form
//         onSubmit={handleSubmit}
//         className="bg-white shadow-sm border rounded-md w-full max-w-4xl p-4 md:p-6 hover:shadow-md transition"
//         noValidate
//       >
//         <h2 className="text-lg font-bold text-purple-700 mb-6">
//           📝 Complete Your Business Profile
//         </h2>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
//           {fields.map(([label, name, type]) => (
//             <div key={name}>
//               <label
//                 htmlFor={name}
//                 className="text-xs font-medium text-gray-600 block mb-1"
//               >
//                 {label}
//               </label>
//               <input
//                 id={name}
//                 type={type}
//                 name={name}
//                 value={form[name]}
//                 onChange={handleChange}
//                 placeholder={`Enter ${label.toLowerCase()}`}
//                 className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
//                   errors[name] ? "border-red-500" : "border-gray-300"
//                 }`}
//                 aria-invalid={errors[name] ? "true" : "false"}
//                 aria-describedby={`${name}-error`}
//               />
//               {errors[name] && (
//                 <p
//                   className="text-red-600 text-xs mt-1"
//                   id={`${name}-error`}
//                   role="alert"
//                 >
//                   {errors[name]}
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>

//         <div className="pt-6 border-t mt-6 flex justify-end">
//           <button
//             type="submit"
//             disabled={loading}
//             className={`inline-flex items-center px-5 py-2 rounded-md text-white text-sm font-medium transition ${
//               loading
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-purple-600 hover:bg-purple-700"
//             }`}
//           >
//             {loading ? "🔄 Submitting..." : "✅ Submit Profile"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  UsersRound,
  CheckCircle,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../app/providers/AuthProvider";
import { usePlan } from "../pages/auth/hooks/usePlan";

export default function WelcomeCenter() {
  const navigate = useNavigate();
  const { userName } = useAuth();
  const { planObj } = usePlan();

  const [accessCode, setAccessCode] = useState("");
  const [expandedSteps, setExpandedSteps] = useState({
    step1: true,
    step2: false,
    step3: false,
  });

  // Mock credit data - replace with actual API call
  const [credits] = useState({
    ai: 500.0,
    ads: 0.0,
    freeConversations: 0,
    wcc: 50.0,
  });

  const handleStartFreeTrial = () => {
    navigate("/app/upgrade");
  };

  const handleApplyWhatsAppAPI = () => {
    navigate("/app/settings/whatsapp");
  };

  const handleActivateCode = () => {
    // TODO: Implement access code activation
    console.log("Activate code:", accessCode);
  };

  const toggleStep = step => {
    setExpandedSteps(prev => ({
      ...prev,
      [step]: !prev[step],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Free Trial Banner */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-400 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">💎</div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">
                    Unlock Everything for 1 Month—Free!
                  </h3>
                  <p className="text-sm text-green-700 mt-1 flex items-center gap-1">
                    <UsersRound size={14} />
                    Join thousands of satisfied users today
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Get full access to all features across the platform
                  </p>
                  <ul className="text-xs text-green-700 mt-1 list-disc list-inside">
                    <li>
                      Experience a complete 1-month free trial of the entire
                      platform
                    </li>
                    <li>
                      Access all Pro + Flow plan features and capabilities
                    </li>
                  </ul>
                </div>
              </div>
              <button
                onClick={handleStartFreeTrial}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow hover:shadow-md transition flex items-center gap-2 shrink-0"
              >
                Start Free Trial Now
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* Setup WhatsApp Business API */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Setup FREE WhatsApp Business Account
              </h3>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                3 steps left
              </span>
            </div>

            {/* Step 1 - Apply for WhatsApp Business API */}
            <div className="border border-gray-300 rounded-lg mb-2 hover:border-gray-400 transition-colors duration-200">
              <button
                onClick={() => toggleStep("step1")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={20} />
                  <span className="font-semibold text-gray-900">
                    Apply for WhatsApp Business API
                  </span>
                </div>
                <ChevronRight
                  className={`transition-transform ${
                    expandedSteps.step1 ? "rotate-90" : ""
                  }`}
                  size={16}
                />
              </button>

              {expandedSteps.step1 && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Click on Continue With Facebook to apply for WhatsApp
                      Business API
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      Requirements to apply for WhatsApp Business API: A
                      Registered Business & Working Website.
                    </p>

                    {/* Video Tutorial */}
                    <div className="relative bg-gray-200 rounded-lg aspect-video mb-3">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="text-purple-600" size={40} />
                      </div>
                      <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-semibold">
                        Tutorial
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-white rounded p-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <Play className="text-purple-600" size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-700">
                                How to get FREE WhatsApp API
                              </p>
                              <span className="text-xs text-purple-600">
                                in 10 Mins
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition">
                        Schedule Meetings
                      </button>
                      <button
                        onClick={handleApplyWhatsAppAPI}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition shadow"
                      >
                        Continue With Facebook
                      </button>
                    </div>

                    {/* Link to tutorial */}
                    <button className="text-xs text-blue-600 hover:underline mt-2">
                      How to apply for WhatsApp Business API?
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 - Increase messaging limit & get display name approved */}
            <div className="border border-gray-300 rounded-lg mb-2 hover:border-gray-400 transition-colors duration-200">
              <button
                onClick={() => toggleStep("step2")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-orange-500" size={20} />
                  <span className="font-semibold text-gray-900">
                    Increase your messaging limit & get your display name
                    approved
                  </span>
                </div>
                <ChevronRight
                  className={`transition-transform ${
                    expandedSteps.step2 ? "rotate-90" : ""
                  }`}
                  size={16}
                />
              </button>

              {expandedSteps.step2 && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Verify your business identity to unlock higher messaging
                      capacity and get your business name verified
                    </p>

                    {/* KYC Requirements */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <h5 className="text-sm font-semibold text-orange-900 mb-3">
                        Verification Checklist:
                      </h5>
                      <ul className="text-sm text-orange-800 space-y-2 list-disc list-inside">
                        <li>
                          Business name on your GST registration must be
                          identical to your Facebook Business Manager account
                        </li>
                        <li>
                          Your company website must be live and accessible
                          before submitting verification documents
                        </li>
                        <li>
                          Submit the Aadhaar card of the director whose name
                          appears on your GST certificate
                        </li>
                      </ul>
                      <p className="text-xs text-orange-700 mt-3">
                        Need additional guidance? Check our{" "}
                        <button className="underline font-semibold">
                          verification guide
                        </button>
                      </p>
                    </div>

                    <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition">
                      Start KYC
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3 - Setup Your Profile */}
            <div className="border border-gray-300 rounded-lg mb-2 hover:border-gray-400 transition-colors duration-200">
              <button
                onClick={() => toggleStep("step3")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-blue-500" size={20} />
                  <span className="font-semibold text-gray-900">
                    Setup Your Profile
                  </span>
                </div>
                <ChevronRight
                  className={`transition-transform ${
                    expandedSteps.step3 ? "rotate-90" : ""
                  }`}
                  size={16}
                />
              </button>

              {expandedSteps.step3 && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Complete your business profile with logo, description, and
                      contact information.
                    </p>
                    <button
                      onClick={() =>
                        window.open(
                          "https://business.facebook.com/latest/whatsapp_manager/overview/?business_id=1691627885569206&tab=home&nav_ref=whatsapp_manager&asset_id=1777503206267612",
                          "_blank"
                        )
                      }
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tutorials Section */}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Links & Resources moved here */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">
              Quick Links &amp; Resources
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Learn how to use templates, campaigns, live chat and chatbots.
            </p>

            <div className="mt-4 space-y-5 text-sm">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  📄 Templates
                </h4>
                <ul className="space-y-1">
                  <li className="text-blue-600 hover:underline cursor-pointer">
                    How to Create WhatsApp Template Message?
                  </li>

                  <li className="text-blue-600 hover:underline cursor-pointer">
                    How to apply for WhatsApp Business Api Free?
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   Play,
//   UsersRound,
//   CheckCircle,
//   ChevronRight,
//   Lock,
//   ArrowRight,
// } from "lucide-react";
// import { useAuth } from "../../app/providers/AuthProvider";
// import { usePlan } from "../auth/hooks/usePlan";

// export default function WelcomeCenter() {
//   const navigate = useNavigate();
//   const { userName } = useAuth();
//   const { planObj } = usePlan();

//   const [accessCode, setAccessCode] = useState("");
//   const [expandedSteps, setExpandedSteps] = useState({
//     step1: true,
//     step2: false,
//     step3: false,
//   });

//   // Mock credit data - replace with actual API call
//   const [credits] = useState({
//     ai: 500.0,
//     ads: 0.0,
//     freeConversations: 0,
//     wcc: 50.0,
//   });

//   const handleStartFreeTrial = () => {
//     navigate("/app/upgrade");
//   };

//   const handleApplyWhatsAppAPI = () => {
//     navigate("/app/settings/whatsapp");
//   };

//   const handleActivateCode = () => {
//     // TODO: Implement access code activation
//     console.log("Activate code:", accessCode);
//   };

//   const toggleStep = step => {
//     setExpandedSteps(prev => ({
//       ...prev,
//       [step]: !prev[step],
//     }));
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
//       {/* Welcome Bar moved to Dashboard header */}

//       {/* Main Content Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Left Column */}
//         <div className="lg:col-span-2 space-y-6">
//           {/* Free Trial Banner */}
//           <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-400 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
//             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
//               <div className="flex items-start gap-3">
//                 <div className="text-3xl">💎</div>
//                 <div>
//                   <h3 className="text-lg font-bold text-green-900">
//                     Unlock Everything for 1 Month—Free!
//                   </h3>
//                   <p className="text-sm text-green-700 mt-1 flex items-center gap-1">
//                     <UsersRound size={14} />
//                     Join thousands of satisfied users today
//                   </p>
//                   <p className="text-xs text-green-600 mt-2">
//                     Get full access to all features across the platform
//                   </p>
//                   <ul className="text-xs text-green-700 mt-1 list-disc list-inside">
//                     <li>
//                       Experience a complete 1-month free trial of the entire
//                       platform
//                     </li>
//                     <li>
//                       Access all Pro + Flow plan features and capabilities
//                     </li>
//                   </ul>
//                 </div>
//               </div>
//               <button
//                 onClick={handleStartFreeTrial}
//                 className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow hover:shadow-md transition flex items-center gap-2 shrink-0"
//               >
//                 Start Free Trial Now
//                 <ArrowRight size={18} />
//               </button>
//             </div>
//           </div>

//           {/* Setup WhatsApp Business API */}
//           <div className="bg-white border rounded-lg p-4 shadow-sm">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-lg font-bold text-gray-900">
//                 Setup FREE WhatsApp Business Account
//               </h3>
//               <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
//                 3 steps left
//               </span>
//             </div>

//             {/* Step 1 - Apply for WhatsApp Business API */}
//             <div className="border border-gray-300 rounded-lg mb-2 hover:border-gray-400 transition-colors duration-200">
//               <button
//                 onClick={() => toggleStep("step1")}
//                 className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
//               >
//                 <div className="flex items-center gap-3">
//                   <CheckCircle className="text-green-600" size={20} />
//                   <span className="font-semibold text-gray-900">
//                     Apply for WhatsApp Business API
//                   </span>
//                 </div>
//                 <ChevronRight
//                   className={`transition-transform ${
//                     expandedSteps.step1 ? "rotate-90" : ""
//                   }`}
//                   size={16}
//                 />
//               </button>

//               {expandedSteps.step1 && (
//                 <div className="px-4 pb-4 border-t border-gray-200">
//                   <div className="pt-4">
//                     <p className="text-sm text-gray-600 mb-3">
//                       Click on Continue With Facebook to apply for WhatsApp
//                       Business API
//                     </p>
//                     <p className="text-xs text-gray-500 mb-3">
//                       Requirements to apply for WhatsApp Business API: A
//                       Registered Business & Working Website.
//                     </p>

//                     {/* Video Tutorial */}
//                     <div className="relative bg-gray-200 rounded-lg aspect-video mb-3">
//                       <div className="absolute inset-0 flex items-center justify-center">
//                         <Play className="text-purple-600" size={40} />
//                       </div>
//                       <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-semibold">
//                         Tutorial
//                       </div>
//                       <div className="absolute bottom-2 left-2 right-2">
//                         <div className="bg-white rounded p-2">
//                           <div className="flex items-center gap-2">
//                             <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
//                               <Play className="text-purple-600" size={16} />
//                             </div>
//                             <div>
//                               <p className="text-xs font-semibold text-gray-700">
//                                 How to get FREE WhatsApp API
//                               </p>
//                               <span className="text-xs text-purple-600">
//                                 in 10 Mins
//                               </span>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Action Buttons */}
//                     <div className="flex gap-2 mt-3">
//                       <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition">
//                         Schedule Meetings
//                       </button>
//                       <button
//                         onClick={handleApplyWhatsAppAPI}
//                         className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition shadow"
//                       >
//                         Continue With Facebook
//                       </button>
//                     </div>

//                     {/* Link to tutorial */}
//                     <button className="text-xs text-blue-600 hover:underline mt-2">
//                       How to apply for WhatsApp Business API?
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Step 2 - Increase messaging limit & get display name approved */}
//             <div className="border border-gray-300 rounded-lg mb-2 hover:border-gray-400 transition-colors duration-200">
//               <button
//                 onClick={() => toggleStep("step2")}
//                 className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
//               >
//                 <div className="flex items-center gap-3">
//                   <CheckCircle className="text-orange-500" size={20} />
//                   <span className="font-semibold text-gray-900">
//                     Increase your messaging limit & get your display name
//                     approved
//                   </span>
//                 </div>
//                 <ChevronRight
//                   className={`transition-transform ${
//                     expandedSteps.step2 ? "rotate-90" : ""
//                   }`}
//                   size={16}
//                 />
//               </button>

//               {expandedSteps.step2 && (
//                 <div className="px-4 pb-4 border-t border-gray-200">
//                   <div className="pt-4">
//                     <p className="text-sm text-gray-600 mb-4">
//                       Verify your business identity to unlock higher messaging
//                       capacity and get your business name verified
//                     </p>

//                     {/* KYC Requirements */}
//                     <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
//                       <h5 className="text-sm font-semibold text-orange-900 mb-3">
//                         Verification Checklist:
//                       </h5>
//                       <ul className="text-sm text-orange-800 space-y-2 list-disc list-inside">
//                         <li>
//                           Business name on your GST registration must be
//                           identical to your Facebook Business Manager account
//                         </li>
//                         <li>
//                           Your company website must be live and accessible
//                           before submitting verification documents
//                         </li>
//                         <li>
//                           Submit the Aadhaar card of the director whose name
//                           appears on your GST certificate
//                         </li>
//                       </ul>
//                       <p className="text-xs text-orange-700 mt-3">
//                         Need additional guidance? Check our{" "}
//                         <button className="underline font-semibold">
//                           verification guide
//                         </button>
//                       </p>
//                     </div>

//                     <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition">
//                       Start KYC
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Step 3 - Setup Your Profile */}
//             <div className="border border-gray-300 rounded-lg mb-2 hover:border-gray-400 transition-colors duration-200">
//               <button
//                 onClick={() => toggleStep("step3")}
//                 className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
//               >
//                 <div className="flex items-center gap-3">
//                   <CheckCircle className="text-blue-500" size={20} />
//                   <span className="font-semibold text-gray-900">
//                     Setup Your Profile
//                   </span>
//                 </div>
//                 <ChevronRight
//                   className={`transition-transform ${
//                     expandedSteps.step3 ? "rotate-90" : ""
//                   }`}
//                   size={16}
//                 />
//               </button>

//               {expandedSteps.step3 && (
//                 <div className="px-4 pb-4 border-t border-gray-200">
//                   <div className="pt-4">
//                     <p className="text-sm text-gray-600 mb-3">
//                       Complete your business profile with logo, description, and
//                       contact information.
//                     </p>
//                     <button
//                       onClick={() =>
//                         window.open(
//                           "https://business.facebook.com/latest/whatsapp_manager/overview/?business_id=1691627885569206&tab=home&nav_ref=whatsapp_manager&asset_id=1777503206267612",
//                           "_blank"
//                         )
//                       }
//                       className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition"
//                     >
//                       Edit Profile
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Start WhatsApp Engagement Section moved to dashboard header */}

//           {/* Tutorials Section */}
//           <div className="bg-white border rounded-lg p-4 shadow-sm">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-lg font-bold text-gray-900">
//                 Platform Walkthrough & Tutorials
//               </h3>
//               <button className="text-sm text-purple-600 hover:underline">
//                 Read Platform Guide
//               </button>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {/* Video 1 */}
//               <div className="relative bg-gray-200 rounded-lg aspect-video">
//                 <div className="absolute inset-0 flex items-center justify-center">
//                   <Play className="text-purple-600" size={40} />
//                 </div>
//                 <div className="absolute bottom-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">
//                   HINDI
//                 </div>
//                 <p className="absolute bottom-2 left-2 text-xs font-semibold text-gray-800 bg-white px-2 py-1 rounded">
//                   XploreByte Platform Demo
//                 </p>
//               </div>

//               {/* Video 2 */}
//               <div className="relative bg-gray-200 rounded-lg aspect-video">
//                 <div className="absolute inset-0 flex items-center justify-center">
//                   <Play className="text-purple-600" size={40} />
//                 </div>
//                 <p className="absolute bottom-2 left-2 text-xs font-semibold text-gray-800 bg-white px-2 py-1 rounded">
//                   XploreByte Smartest WhatsApp Engagement Platform
//                 </p>
//               </div>
//             </div>
//           </div>

//           {/* Feature Lists */}
//           <div className="bg-white border rounded-lg p-4 shadow-sm">
//             <h3 className="text-lg font-bold text-gray-900 mb-4">
//               Quick Links & Resources
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Left Column */}
//               <div>
//                 <h4 className="font-semibold text-gray-700 mb-2">
//                   📄 Templates
//                 </h4>
//                 <ul className="space-y-2 text-sm">
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     How to Create WhatsApp Template Message?
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Use chatbot parameters for leads
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Add Quick Reply to WhatsApp Template Message
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Message formatting guideline (Bold, Italic & more)
//                   </li>
//                 </ul>

//                 <h4 className="font-semibold text-gray-700 mb-2 mt-6">
//                   💬 Live Chat & Attributes
//                 </h4>
//                 <ul className="space-y-2 text-sm">
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Add user attributes manually
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Add/Remove Tag & update attribute
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Send & Generate media link
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Chat Profile & First Message Tag
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     How to create & add tags to contacts
//                   </li>
//                 </ul>
//               </div>

//               {/* Right Column */}
//               <div>
//                 <h4 className="font-semibold text-gray-700 mb-2">
//                   📢 Campaigns
//                 </h4>
//                 <ul className="space-y-2 text-sm">
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Audience segregation for WhatsApp Broadcast
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Upgrade WhatsApp Tier Limit
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Import upto 2 lakh contacts in one go
//                   </li>
//                 </ul>

//                 <h4 className="font-semibold text-gray-700 mb-2 mt-6">
//                   🤖 Chatbot & Integration
//                 </h4>
//                 <ul className="space-y-2 text-sm">
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Setup Welcome WhatsApp Chatbot
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Create WhatsApp Button for Free
//                   </li>
//                   <li className="text-blue-600 hover:underline cursor-pointer">
//                     Create WhatsApp Link for Free
//                   </li>
//                 </ul>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Right Column */}
//         <div className="space-y-6">{/* Unlock Premium Features */}</div>
//       </div>
//     </div>
//   );
// }

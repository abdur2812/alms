/**
 * AL M.S. TRADERS Business Configuration
 * Contains all business details for invoice generation and application branding
 */

const businessConfig = {
  business_details: {
    business_name: "AL M.S. TRADERS",
    tagline: "Dealers in: Motor Parts, Iron, Spring Leaf and All Vehicles",
    address: {
      door_no_old: "293/1",
      door_no_new: "130",
      street: "G.S.T. Road",
      area: "Urapakkam",
      landmark: "Opp. State Bank of India",
      district: "Chengalpattu",
      pincode: "603210",
      state: "Tamil Nadu",
      country: "India",
    },
    phone_numbers: ["+919884496668", "+919791021564"],
    gst_number: "33AXHPK8999E1ZY",
  },
  bank_details: {
    account_holder: "AL.M.S TRADERS",
    bank_name: "HDFC BANK",
    branch_name: "URAPAKKAM",
    account_number: "50200109601612",
    ifsc_code: "HDFC0007824",
  },
  upi: {
    // Merchant UPI ID — used to build dynamic UPI QR: upi://pay?pa=...&pn=...&am=...&cu=INR
    id: "almstraders2017-5@okaxis",
    name: "AL M.S. TRADERS",
  },
  invoice_defaults: {
    currency: "INR",
    country: "India",
  },
  declaration: {
    amount_in_words_format: "Indian Rupee Format",
    footer_note: "E. & O.E.",
    signature_label: "Authorised Signatory",
    thank_you_note: "Thank You, Visit Again For AL M.S TRADERS",
  },
};

// Helper function to format complete business address
businessConfig.getFormattedAddress = () => {
  const addr = businessConfig.business_details.address;
  return `${addr.door_no_old}, ${addr.door_no_new}, ${addr.street}, ${addr.area}, ${addr.landmark}, ${addr.district} - ${addr.pincode}, ${addr.state}, ${addr.country}`;
};

// Helper function to get primary phone
businessConfig.getPrimaryPhone = () => {
  return businessConfig.business_details.phone_numbers[0];
};

// Helper function to get formatted phone numbers
businessConfig.getFormattedPhones = () => {
  return businessConfig.business_details.phone_numbers.join(", ");
};

module.exports = businessConfig;

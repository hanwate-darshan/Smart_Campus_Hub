"use client";

import ProfilePage from "@/components/shared/ProfilePage";

export default function SecurityProfilePage() {
  return (
    <ProfilePage
      role="security"
      apiEndpoint="/api/security/profile"
      editableFields={[
        { key: "name", label: "Full Name", placeholder: "Security Officer Name" },
        { key: "phone", label: "Phone Number", placeholder: "10-digit emergency number" },
        { key: "bio", label: "Bio", type: "textarea", placeholder: "Add a short bio..." },
      ]}
    />
  );
}

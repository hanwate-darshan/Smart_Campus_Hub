"use client";

import ProfilePage from "@/components/shared/ProfilePage";

export default function StudentProfilePage() {
  return (
    <ProfilePage
      role="student"
      apiEndpoint="/api/students/profile"
      editableFields={[
        { key: "name", label: "Full Name", placeholder: "John Doe" },
        { key: "phone", label: "Phone Number", placeholder: "10-digit number" },
        { key: "department", label: "Department", placeholder: "e.g. Mechanical Engineering" },
        { key: "year", label: "Academic Year", type: "select", options: ["1st", "2nd", "3rd", "4th"] },
        { key: "bio", label: "Bio", type: "textarea", placeholder: "Tell campus about yourself..." },
      ]}
    />
  );
}

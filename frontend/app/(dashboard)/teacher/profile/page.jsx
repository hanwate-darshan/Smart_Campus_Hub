"use client";

import ProfilePage from "@/components/shared/ProfilePage";

export default function TeacherProfilePage() {
  return (
    <ProfilePage
      role="teacher"
      apiEndpoint="/api/teachers/profile"
      editableFields={[
        { key: "name", label: "Full Name", placeholder: "Jane Doe" },
        { key: "phone", label: "Phone Number", placeholder: "10-digit number" },
        { key: "department", label: "Department", placeholder: "e.g. Computer Science" },
        { key: "bio", label: "Bio", type: "textarea", placeholder: "Tell campus about yourself..." },
      ]}
    />
  );
}

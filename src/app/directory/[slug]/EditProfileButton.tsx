"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Button from "@/components/Button";
import EditProfileModal from "./EditProfileModal";

interface EditProfileButtonProps {
  memberSlug: string;
}

export default function EditProfileButton({ memberSlug }: EditProfileButtonProps) {
  const { member } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Only show if viewing your own profile
  if (!member || member.slug !== memberSlug) {
    return null;
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Edit Profile
      </Button>
      <EditProfileModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}


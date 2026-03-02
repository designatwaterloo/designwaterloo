"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import Button from "@/components/Button";

interface EditProfileButtonProps {
  memberSlug: string;
}

export default function EditProfileButton({ memberSlug }: EditProfileButtonProps) {
  const { member } = useAuth();

  // Only show if viewing your own profile
  if (!member || member.slug !== memberSlug) {
    return null;
  }

  return (
    <Button variant="secondary" href="/profile/edit">
      Edit Profile
    </Button>
  );
}

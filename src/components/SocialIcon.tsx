/** Reuse the same brand artwork as the public profile, tinted to the surrounding text. */
export default function SocialIcon({ platform, size = 20 }: {
  platform: 'github' | 'instagram' | 'linkedin' | 'twitter';
  size?: number;
}) {
  return <span aria-hidden="true" style={{
    display: 'inline-block', width: size, height: size, flexShrink: 0,
    backgroundColor: 'currentColor',
    mask: `url("/${platform}_logo.svg") center / contain no-repeat`,
  }} />;
}

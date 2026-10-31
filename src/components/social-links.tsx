const socialLinks = [
  { name: "Facebook", href: "https://www.facebook.com/DPSAGovernmentJobs" },
  { name: "X", href: "https://x.com/dpsajobs" },
  { name: "Pinterest", href: "https://za.pinterest.com/dpsavacancies/" },
];

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`social-links ${className}`.trim()} aria-label="Social media">
      {socialLinks.map(({ name, href }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer">
          {name}
        </a>
      ))}
    </nav>
  );
}

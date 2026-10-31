const socialLinks = [
  { name: "Facebook", mark: "f", href: "https://www.facebook.com/DPSAGovernmentJobs" },
  { name: "X", mark: "𝕏", href: "https://x.com/dpsajobs" },
  { name: "Pinterest", mark: "P", href: "https://za.pinterest.com/dpsavacancies/" },
];

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`social-links ${className}`.trim()} aria-label="Social media">
      {socialLinks.map(({ name, mark, href }) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Follow DPSA Government Jobs on ${name}`}>
          <span aria-hidden="true">{mark}</span>
        </a>
      ))}
    </nav>
  );
}

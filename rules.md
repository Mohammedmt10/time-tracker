# Development Rules & Checklist

These are the primary rules governing code contribution, styling, performance, and security for this repository. You must review this file before making any changes.

---

## 1. Do Not Expose `.env` Variables
- **CRITICAL**: Never hardcode or expose environment variables (e.g., API keys, secrets, database URLs) in any codebase file.
- If a `.env` file exists, reference configuration values using safe backend utilities or NEXT_PUBLIC prefixed variables only when explicitly safe and required for client-side functionality.
- Always check the files modified in your changes to ensure no sensitive credentials have been accidentally committed or printed in logs.

## 2. Modern Code Standards (No Legacy Code)
- Use **ES6+ JavaScript/TypeScript** syntax exclusively (e.g., arrow functions, destructuring, modules, async/await, optional chaining).
- Avoid legacy patterns (e.g., `var`, outdated promise chains, non-arrow functions for callbacks, legacy lifecycle methods).

## 3. Styling & Animations
- Use **Tailwind CSS** for styling.
- Use **Motion** (Framer Motion) for smooth animations.
- Ensure all styled elements are clean, responsive, and follow premium visual design guidelines.

## 4. Production-Ready Quality & Web Vitals
- Optimize for high Core Web Vitals (LCP, FID/INP, CLS).
- Ensure this remains a production-ready application, not a simple prototype.
- Implement robust error handling, semantic HTML, proper SEO, and responsive design.

---

## Rule Verification Cycle
Before submitting any changes, perform this quick validation check:
1. [ ] Have I verified that no credentials, secrets, or `.env` variable values are hardcoded in the diff?
2. [ ] Does all newly written code use ES6+ structures and follow TypeScript standards?
3. [ ] Are animations/styling strictly using Tailwind CSS / Motion?
4. [ ] Are pages optimized for performance, clean responsiveness, and high Core Web Vitals?

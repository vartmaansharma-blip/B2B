import Link from "next/link";
import Image from "next/image";
import { MotionPreference } from "@/components/motion-preference";
import { Hexagon, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";

import { signIn } from "@/features/auth/actions";
import { readConfig } from "@/lib/env";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main id="main" className="auth-shell">
      <div className="auth-intro">
        <Image
          className="auth-art"
          src="/images/industrial-study.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 700px) 100vw, 55vw"
        />
        <Link className="brand" href="/login">
          <span className="brand-mark">
            <Hexagon size={27} strokeWidth={1.6} />
            <span>m</span>
          </span>
          <span className="brand-name">
            Manufacturing<span>OS</span>
          </span>
        </Link>
        <div className="auth-intro-content">
          <span className="eyebrow">
            THE OPERATING SYSTEM FOR DEPENDABLE SUPPLY
          </span>
          <h1>
            Every capability.
            <br />
            Every requirement.
            <br />
            One clear record<span className="heading-dot">.</span>
          </h1>
          <p>
            A private workspace for supplier discovery, engineering judgment,
            and the requirements that matter.
          </p>
        </div>
        <div className="auth-intro-footer">
          <span className="signal-dot" />
          ENGINEERING-LED <span> / </span> EVIDENCE-FIRST <span> / </span> V0
        </div>
      </div>
      <div className="auth-content">
        <section className="auth-card">
          <span className="eyebrow">WELCOME TO YOUR WORKSPACE</span>
          <h2>Sign in to Manufacturing OS</h2>
          <p>
            A considered approach to manufacturing starts here.
            <br />
            Use the staff account invited by your administrator.
          </p>
          {error && (
            <p role="alert">
              This invitation or recovery link is invalid or expired. Request a
              new link from your administrator.
            </p>
          )}
          {!readConfig() ? (
            <p>
              Connection setup is required.{" "}
              <Link href="/setup">
                View setup instructions
                <ArrowRight size={12} />
              </Link>
            </p>
          ) : (
            <ActionForm action={signIn} label="Sign in to workspace">
              <Field label="Work email" name="email">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  required
                  maxLength={254}
                />
              </Field>
              <Field label="Password" name="password">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  maxLength={128}
                />
              </Field>
            </ActionForm>
          )}
          <small>
            Access is by invitation only. For account access or password
            recovery, contact your administrator.
          </small>
          <div className="auth-security-note">
            <LockKeyhole size={12} />
            <span>Private records. Authenticated staff. Human decisions.</span>
            <ShieldCheck size={12} />
            <MotionPreference />
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * The whole story as server-rendered, semantic HTML — for screen readers,
 * search engines and anyone without the canvas. Visually hidden: the cinematic
 * captions on screen are decorative duplicates of these lines.
 */
export function Narrative() {
  return (
    <article className="sr-only" data-testid="cinematic-narrative">
      <h1>Find the direction worth building — Solventia</h1>
      <p>
        Solventia turns your skills, resources and constraints into personalised business
        directions, real-world evidence and an adaptive founder roadmap.
      </p>
      <section>
        <h2>Every founder begins with uncertainty.</h2>
        <p>Solventia turns uncertainty into direction.</p>
      </section>
      <section>
        <h2>It starts with your real situation.</h2>
        <p>
          An illustrative founder profile: capital of ₹50,000, digital development skills, based in
          India, 12 hours a week, beginner experience, limited customer access.
        </p>
      </section>
      <section>
        <h2>Hundreds of possible directions.</h2>
        <p>
          Your reality narrows them. In this illustration, 360 possibilities narrow to 120, then 36,
          then 9, then 3 — and finally one direction worth testing.
        </p>
      </section>
      <section>
        <h2>Prove it before you build it.</h2>
        <p>
          Validate, build, elevate: speak to customers, test willingness to pay, then build a first
          prototype on what the evidence supports.
        </p>
      </section>
      <section>
        <h2>When evidence changes, your path changes.</h2>
        <p>
          When evidence contradicts an assumption — for example a customer saying “I wouldn’t pay
          for this version” — Solventia adapts the path.
        </p>
      </section>
      <section>
        <h2>It doesn’t stop at the idea.</h2>
        <p>
          Your context, evidence and progress stay connected — and your next move is always clear.
        </p>
      </section>
      <section>
        <h2>Find the direction worth building.</h2>
        <p>Your reality. Your evidence. Your path forward.</p>
      </section>
    </article>
  );
}

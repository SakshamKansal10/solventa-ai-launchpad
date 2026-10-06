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
        <p>There is a direction hidden inside your reality.</p>
      </section>
      <section>
        <h2>Solventia starts with you.</h2>
        <p>
          An illustrative founder profile: capital of ₹50,000, digital development skills, based in
          India, 12 hours a week, beginner experience, limited customer access.
        </p>
      </section>
      <section>
        <h2>Hundreds of possible directions.</h2>
        <p>
          Your context reshapes every one of them. In this illustration, 360 possibilities narrow to
          120, then 36, then 9, then 3 — and finally one direction worth testing.
        </p>
      </section>
      <section>
        <h2>Validate, build, elevate.</h2>
        <p>
          Validate: discover what reality supports — speak to potential customers, test the problem,
          test willingness to pay. Build: turn evidence into execution — create a first prototype,
          gather early feedback, improve the offering. Elevate: improve what proves valuable.
        </p>
      </section>
      <section>
        <h2>Plans are assumptions until reality responds.</h2>
        <p>
          When evidence contradicts an assumption — for example a customer saying “I wouldn’t pay
          for this version” — the path changes when the evidence changes.
        </p>
      </section>
      <section>
        <h2>A chatbot answers. Solventia carries the journey forward.</h2>
        <p>Context, opportunity, evidence, path and progress stay connected in one workspace.</p>
      </section>
      <section>
        <h2>Find the direction worth building.</h2>
        <p>Your reality. Your evidence. Your path forward.</p>
      </section>
    </article>
  );
}

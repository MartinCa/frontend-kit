// Fixture for the navigation-is-a-link rule: an onClick/onSelect/onValueChange that only calls navigate()
// must be flagged; handlers that do other work, and non-click handlers, must not be.
declare function navigate(options: { to: string }): Promise<void>;
declare const router: { navigate: (options: { to: string }) => Promise<void> };
declare function save(): void;
declare const carousel: { navigate: (options: { to: string }) => void };

export function Menu() {
  return (
    <div>
      {/* flagged: the handler only navigates (the same thing in 8 shapes) */}
      <button onClick={() => navigate({ to: "/a" })} />
      <button onClick={() => void navigate({ to: "/b" })} />
      <button onClick={() => router.navigate({ to: "/c" })} />
      <button onClick={() => void router.navigate({ to: "/d" })} />
      <button
        onSelect={() => {
          navigate({ to: "/e" });
        }}
      />
      <button
        onSelect={() => {
          void navigate({ to: "/f" });
        }}
      />
      <button
        onClick={() => {
          router.navigate({ to: "/g" });
        }}
      />
      <button
        onClick={() => {
          void router.navigate({ to: "/h" });
        }}
      />

      {/* flagged: a tab's onValueChange, a string path, replace: false and a nested replace */}
      <button onValueChange={() => navigate({ to: "/i" })} />
      <button onClick={() => navigate("/j")} />
      <button onClick={() => navigate({ to: "/n", replace: false })} />
      <button onClick={() => navigate({ to: "/o", options: { replace: true } })} />

      {/* not flagged: URL state (replace: true, in either argument position), history, and an unrelated .navigate() */}
      <button onClick={() => navigate({ to: "/k", replace: true })} />
      <button onClick={() => void navigate({ to: "/l", replace: true })} />
      <button onClick={() => navigate("/p", { replace: true })} />
      <button onClick={() => navigate(-1)} />
      <button onClick={() => navigate(1)} />
      <button onClick={() => carousel.navigate({ to: "/m" })} />

      {/* not flagged: a redirect after real work, a keyboard handler, a plain handler */}
      <button
        onClick={() => {
          save();
          void navigate({ to: "/ok" });
        }}
      />
      <input onKeyDown={() => void navigate({ to: "/ok" })} />
      <button onClick={() => save()} />
    </div>
  );
}

import Navbar from "./Navbar";
import BackgroundCanvas from "../three/BackgroundCanvas";

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#05070f", position: "relative" }}>
      <BackgroundCanvas />
      <Navbar />
      <main
        style={{
          position: "relative",
          zIndex: 10,
          paddingTop: 60,
        }}
      >
        {children}
      </main>
    </div>
  );
}

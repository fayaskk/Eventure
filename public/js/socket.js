(() => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) {
    return;
  }

  const socket = io({
    auth: {
      token,
    },
  });

  socket.on("connect", () => {
    console.log("Connected to Eventure notification server:", socket.id);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
  });

  socket.on("notification:new", (notification) => {
    console.log("New notification received:", notification);

    window.dispatchEvent(
      new CustomEvent("eventure:notification", {
        detail: notification,
      })
    );
  });

  window.eventureSocket = socket;
})();
const getScannerToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken");

const initializeScannerPage = () => {
  const token = getScannerToken();

  if (!token) {
    window.location.replace("/login");
    return;
  }
};

const startButton = document.getElementById("start-scanner-btn");
const readerElement = document.getElementById("ticket-reader");
const stopButton = document.getElementById("stop-scanner-btn");
const scannerStatus = document.getElementById("scanner-status");
const verificationResult = document.getElementById("verification-result");

let scanner = null;
let isProcessing = false;
let lastScannedTicket = null;

const startScanner = async () => {
  scannerStatus.textContent = "Starting camera...";
  startButton.disabled = true;

  try {
    if (!scanner) {
      scanner = new Html5Qrcode(readerElement.id);
    }

    const onScanSuccess = async (decodedText) => {
      if (isProcessing || decodedText === lastScannedTicket) {
        return;
      }

      isProcessing = true;
      try {
        const isVerified = await verifyTicket(decodedText);

        if (isVerified) {
          lastScannedTicket = decodedText;
        }
      } finally {
        isProcessing = false;
      }
    };

    const onScanFailure = () => {};

    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      onScanSuccess,
      onScanFailure,
    );

    stopButton.disabled = false;
    startButton.disabled = true;
    scannerStatus.textContent = "Camera active. Scan an attendee's ticket.";
  } catch (error) {
    console.error("Scanner starting error:", error);

    scannerStatus.textContent =
      "Unable to start the camera. Please check camera permissions and try again.";

    startButton.disabled = false;
    stopButton.disabled = true;
  }
};

const stopScanner = async () => {
  if (!scanner) {
    return;
  }

  try {
    await scanner.stop();

    startButton.disabled = false;
    stopButton.disabled = true;
    scannerStatus.textContent = "Scanner stopped.";
  } catch (error) {
    console.error("Scanner stopping error:", error);
    scannerStatus.textContent = "Unable to stop the scanner. Please try again.";
  }
};

const verifyTicket = async (ticketCode) => {
  try {
    const token = getScannerToken();

    if (!token) {
      window.location.replace("/login");
      return;
    }

    const response = await fetch("/api/host/tickets/check-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ticketCode }),
    });

    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");

      window.location.replace("/login");
      return;
    }
    if (response.status === 409) {
      verificationResult.className = "verification-result verification-warning";

      verificationResult.textContent =
        data.message || "This ticket has already been checked in.";
      return false;
    }

    if (!response.ok) {
      verificationResult.className = "verification-result verification-error";

      verificationResult.textContent =
        data.message || "Ticket verification failed.";

      return false;
    }

    verificationResult.className = "verification-result verification-success";

    verificationResult.replaceChildren();

    const heading = document.createElement("strong");
    heading.textContent = data.message;

    const eventParagraph = document.createElement("p");
    eventParagraph.textContent = `Event: ${data.data.event.name}`;

    const ticketParagraph = document.createElement("p");
    ticketParagraph.textContent = `Ticket Type: ${data.data.ticket.ticketName}`;

    verificationResult.append(heading, eventParagraph, ticketParagraph);

    return true;
  } catch (error) {
    verificationResult.className = "verification-result verification-error";

    verificationResult.textContent =
      error.message || "Unable to verify the ticket.";

    console.error("Ticket verification failed:", error);
    return false;
  }
};

startButton.addEventListener("click", startScanner);
stopButton.addEventListener("click", stopScanner);

initializeScannerPage();

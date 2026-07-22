import OperationsHubClient from "./OperationsHubClient";

/**
 * Operations hub root (`/operations`).
 * Shell topbar is layout-mounted; default active peer = endpoints (0086).
 * Cards remain optional discoverability content under the default peer — not a second L1.
 */
export default function OperationsHubPage() {
  return <OperationsHubClient />;
}

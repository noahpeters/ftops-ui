import { useEffect, useMemo, useState } from "react";
import { buildUrl, fetchJson } from "./lib/api";
import { JsonView } from "./components/JsonView";
import "./index.css";

const EXAMPLE_URIS = [
  "manual://proposal/demo",
  "shopify://order/example",
  "qbo://invoice/example",
];

const TAB_STORAGE_KEY = "ftops-ui:tab";
const RECORD_URI_STORAGE_KEY = "ftops-ui:record-uri";

type PlanPreviewState = {
  status?: number;
  url?: string;
  durationMs?: number;
  data?: unknown;
  text?: string;
  error?: string;
};

type EventsState = {
  status?: number;
  url?: string;
  durationMs?: number;
  data?: unknown;
  text?: string;
  error?: string;
};

type EventsTestState = {
  status?: number;
  url?: string;
  durationMs?: number;
  data?: unknown;
  text?: string;
  error?: string;
};

export default function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem(TAB_STORAGE_KEY) || "preview";
  });

  const [recordUri, setRecordUri] = useState<string>(() => {
    return localStorage.getItem(RECORD_URI_STORAGE_KEY) || "";
  });

  const [previewState, setPreviewState] = useState<PlanPreviewState>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const [eventsState, setEventsState] = useState<EventsState>({});
  const [eventsLoading, setEventsLoading] = useState(false);
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);

  const [testSource, setTestSource] = useState("manual");
  const [testType, setTestType] = useState("preview");
  const [testExternalId, setTestExternalId] = useState("example-1");
  const [testPayload, setTestPayload] = useState("{\n  \"hello\": \"world\"\n}");
  const [testState, setTestState] = useState<EventsTestState>({});
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(RECORD_URI_STORAGE_KEY, recordUri);
  }, [recordUri]);

  const previewUrl = useMemo(() => {
    if (!recordUri.trim()) return "";
    return buildUrl("/plan/preview", { record_uri: recordUri.trim() });
  }, [recordUri]);

  async function runPreview(): Promise<void> {
    if (!recordUri.trim()) {
      setPreviewState({ error: "Record URI is required." });
      return;
    }

    const url = buildUrl("/plan/preview", { record_uri: recordUri.trim() });
    setPreviewLoading(true);
    setPreviewState({ url });

    try {
      const result = await fetchJson(url, { method: "GET" });
      setPreviewState({
        url,
        status: result.status,
        durationMs: result.durationMs,
        data: result.data ?? undefined,
        text: result.text,
        error: !result.ok
          ? `Request failed with status ${result.status}.`
          : result.data === null && result.text
          ? "Response was not valid JSON."
          : undefined,
      });
    } catch (error) {
      setPreviewState({
        url,
        error:
          error instanceof Error ? error.message : "Failed to fetch preview.",
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function refreshEvents(): Promise<void> {
    const url = buildUrl("/events");
    setEventsLoading(true);
    setEventsState({ url });
    setExpandedRowIndex(null);

    try {
      const result = await fetchJson(url, { method: "GET" });
      setEventsState({
        url,
        status: result.status,
        durationMs: result.durationMs,
        data: result.data ?? undefined,
        text: result.text,
        error: !result.ok
          ? `Request failed with status ${result.status}.`
          : result.data === null && result.text
          ? "Response was not valid JSON."
          : undefined,
      });
    } catch (error) {
      setEventsState({
        url,
        error:
          error instanceof Error ? error.message : "Failed to load events.",
      });
    } finally {
      setEventsLoading(false);
    }
  }

  async function runEventsTest(): Promise<void> {
    const url = buildUrl("/events/test");
    setTestLoading(true);
    setTestState({ url });

    let payload: unknown;
    try {
      payload = testPayload.trim() ? JSON.parse(testPayload) : {};
    } catch (error) {
      setTestState({
        url,
        error: "Payload must be valid JSON.",
      });
      setTestLoading(false);
      return;
    }

    try {
      const result = await fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: testSource,
          type: testType,
          externalId: testExternalId,
          payload,
        }),
      });

      setTestState({
        url,
        status: result.status,
        durationMs: result.durationMs,
        data: result.data ?? undefined,
        text: result.text,
        error: !result.ok
          ? `Request failed with status ${result.status}.`
          : result.data === null && result.text
          ? "Response was not valid JSON."
          : undefined,
      });
    } catch (error) {
      setTestState({
        url,
        error:
          error instanceof Error ? error.message : "Failed to post test event.",
      });
    } finally {
      setTestLoading(false);
    }
  }

  const planId =
    typeof previewState.data === "object" && previewState.data
      ? (previewState.data as { plan_id?: string }).plan_id
      : undefined;

  const warnings =
    typeof previewState.data === "object" && previewState.data
      ? (previewState.data as { warnings?: string[] }).warnings
      : undefined;

  const idempotencyKey =
    typeof testState.data === "object" && testState.data
      ? ((testState.data as { idempotencyKey?: string; idempotency_key?: string })
          .idempotencyKey ||
        (testState.data as { idempotencyKey?: string; idempotency_key?: string })
          .idempotency_key)
      : undefined;

  const events = Array.isArray(eventsState.data)
    ? eventsState.data
    : Array.isArray((eventsState.data as { events?: unknown[] } | undefined)?.events)
    ? (eventsState.data as { events?: unknown[] }).events
    : [];

  async function copyToClipboard(label: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copied to clipboard.`);
    } catch (error) {
      alert("Copy failed. Please copy manually.");
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>ftops internal UI</h1>
          <p>Plan preview + events viewer for ftops endpoints.</p>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === "preview" ? "active" : ""}
          onClick={() => setActiveTab("preview")}
          type="button"
        >
          Plan Preview
        </button>
        <button
          className={activeTab === "events" ? "active" : ""}
          onClick={() => setActiveTab("events")}
          type="button"
        >
          Events Viewer
        </button>
      </nav>

      {activeTab === "preview" && (
        <section className="panel">
          <h2>Plan Preview</h2>
          <div className="form-row">
            <label htmlFor="record-uri">Record URI</label>
            <input
              id="record-uri"
              type="text"
              value={recordUri}
              onChange={(event) => setRecordUri(event.target.value)}
              placeholder="manual://proposal/demo"
            />
          </div>

          <div className="example-row">
            <span>Example URIs:</span>
            {EXAMPLE_URIS.map((uri) => (
              <button
                key={uri}
                type="button"
                onClick={() => setRecordUri(uri)}
              >
                {uri}
              </button>
            ))}
          </div>

          <div className="actions">
            <button
              type="button"
              onClick={runPreview}
              disabled={previewLoading}
            >
              {previewLoading ? "Running..." : "Run Preview"}
            </button>
            {previewUrl && (
              <span className="url-hint">{previewUrl}</span>
            )}
          </div>

          <div className="results">
            {previewState.error && (
              <div className="error">{previewState.error}</div>
            )}

            {previewState.status !== undefined && (
              <div className="meta">
                <div>
                  <strong>Status:</strong> {previewState.status}
                </div>
                <div>
                  <strong>Duration:</strong> {previewState.durationMs} ms
                </div>
                <div>
                  <strong>Request URL:</strong> {previewState.url}
                </div>
              </div>
            )}

            {planId && (
              <div className="highlight">
                <div>
                  <strong>plan_id:</strong> {planId}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("plan_id", planId)}
                >
                  Copy plan_id
                </button>
              </div>
            )}

            {warnings && warnings.length > 0 && (
              <div className="highlight warning">
                <strong>Warnings:</strong>
                <ul>
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewState.data !== undefined && (
              <div className="json-block">
                <div className="json-header">
                  <strong>Response JSON</strong>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        "response JSON",
                        previewState.text ||
                          JSON.stringify(previewState.data, null, 2)
                      )
                    }
                  >
                    Copy JSON
                  </button>
                </div>
                <JsonView data={previewState.data} />
              </div>
            )}

            {previewState.data === undefined && previewState.text && (
              <div className="json-block">
                <div className="json-header">
                  <strong>Response Text</strong>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard("response text", previewState.text || "")
                    }
                  >
                    Copy text
                  </button>
                </div>
                <pre>{previewState.text}</pre>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "events" && (
        <section className="panel">
          <h2>Events Viewer</h2>
          <div className="actions">
            <button
              type="button"
              onClick={refreshEvents}
              disabled={eventsLoading}
            >
              {eventsLoading ? "Refreshing..." : "Refresh"}
            </button>
            {eventsState.url && (
              <span className="url-hint">{eventsState.url}</span>
            )}
          </div>

          <div className="results">
            {eventsState.error && (
              <div className="error">{eventsState.error}</div>
            )}

            {eventsState.status !== undefined && (
              <div className="meta">
                <div>
                  <strong>Status:</strong> {eventsState.status}
                </div>
                <div>
                  <strong>Duration:</strong> {eventsState.durationMs} ms
                </div>
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>source</th>
                    <th>type</th>
                    <th>external_id</th>
                    <th>received_at</th>
                    <th>processed_at</th>
                    <th>process_error</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty">
                        No events loaded yet.
                      </td>
                    </tr>
                  )}
                  {events.map((event, index) => {
                    const row = event as Record<string, unknown>;
                    const isExpanded = expandedRowIndex === index;
                    return (
                      <tr
                        key={index}
                        className={isExpanded ? "expanded" : ""}
                        onClick={() =>
                          setExpandedRowIndex(
                            isExpanded ? null : index
                          )
                        }
                      >
                        <td>{String(row.source ?? "")}</td>
                        <td>{String(row.type ?? "")}</td>
                        <td>{String(row.external_id ?? row.externalId ?? "")}</td>
                        <td>{String(row.received_at ?? row.receivedAt ?? "")}</td>
                        <td>{String(row.processed_at ?? row.processedAt ?? "")}</td>
                        <td>{String(row.process_error ?? row.processError ?? "")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {expandedRowIndex !== null && events[expandedRowIndex] && (
              <div className="json-block">
                <div className="json-header">
                  <strong>Event Details</strong>
                </div>
                <JsonView data={events[expandedRowIndex]} />
              </div>
            )}
          </div>

          <div className="divider" />

          <div className="panel-sub">
            <h3>POST /events/test</h3>
            <div className="form-grid">
              <label>
                Source
                <input
                  type="text"
                  value={testSource}
                  onChange={(event) => setTestSource(event.target.value)}
                />
              </label>
              <label>
                Type
                <input
                  type="text"
                  value={testType}
                  onChange={(event) => setTestType(event.target.value)}
                />
              </label>
              <label>
                External ID
                <input
                  type="text"
                  value={testExternalId}
                  onChange={(event) => setTestExternalId(event.target.value)}
                />
              </label>
            </div>

            <label className="full">
              Payload JSON
              <textarea
                rows={6}
                value={testPayload}
                onChange={(event) => setTestPayload(event.target.value)}
              />
            </label>

            <div className="actions">
              <button
                type="button"
                onClick={runEventsTest}
                disabled={testLoading}
              >
                {testLoading ? "Sending..." : "Send Test Event"}
              </button>
              {testState.url && (
                <span className="url-hint">{testState.url}</span>
              )}
            </div>

            {testState.error && <div className="error">{testState.error}</div>}

            {testState.status !== undefined && (
              <div className="meta">
                <div>
                  <strong>Status:</strong> {testState.status}
                </div>
                <div>
                  <strong>Duration:</strong> {testState.durationMs} ms
                </div>
              </div>
            )}

            {idempotencyKey && (
              <div className="highlight">
                <div>
                  <strong>idempotencyKey:</strong> {idempotencyKey}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard("idempotencyKey", idempotencyKey)
                  }
                >
                  Copy idempotencyKey
                </button>
              </div>
            )}

            {testState.data !== undefined && (
              <div className="json-block">
                <div className="json-header">
                  <strong>Response</strong>
                </div>
                <JsonView data={testState.data} />
              </div>
            )}

            {testState.data === undefined && testState.text && (
              <div className="json-block">
                <div className="json-header">
                  <strong>Response Text</strong>
                </div>
                <pre>{testState.text}</pre>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

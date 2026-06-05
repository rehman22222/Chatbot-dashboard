import { Copy, KeyRound, Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const apiBaseUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const expressSnippet = `// Express example
const { pulseOpsAgent } = require("./pulseopsAgent");

app.use(pulseOpsAgent({
  projectId: process.env.PULSEOPS_PROJECT_ID,
  apiKey: process.env.PULSEOPS_API_KEY,
  ingestUrl: process.env.PULSEOPS_INGEST_URL
}));`;

const ProjectOnboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [projectName, setProjectName] = useState('Loadshedding Tracker');
  const [setup, setSetup] = useState(null);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projects, setProjects] = useState([]);
  const [copied, setCopied] = useState(false);

  const loadProjects = async () => {
    setIsLoadingProjects(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/projects`);
      if (!response.ok) {
        throw new Error('Could not load projects');
      }

      const body = await response.json();
      setProjects(body.projects || []);
    } catch {
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const createProject = async () => {
    setIsCreating(true);
    setError('');
    setCopied(false);

    try {
      const response = await fetch(`${apiBaseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: projectName }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Could not create monitoring project');
      }

      setSetup(await response.json());
      loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const copyEnv = async () => {
    if (!setup?.envSnippet) return;

    try {
      await navigator.clipboard.writeText(setup.envSnippet);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="button button-secondary"
        onClick={() => setIsOpen(true)}
        title="Add a backend project to monitor"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>Add project</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <section className="panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Agent Setup</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Add a project to PulseOps</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Generate credentials for a backend agent. The monitored app pushes metrics out to PulseOps, so it does not expose a public monitoring URL.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-sm font-medium text-zinc-300">Project name</span>
                <input
                  className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#0b0c10] px-3 text-sm text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Example: Loadshedding Tracker"
                />
              </label>
              <button
                type="button"
                className="button button-primary self-end"
                onClick={createProject}
                disabled={isCreating || !projectName.trim()}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                <span>{isCreating ? 'Creating...' : 'Generate key'}</span>
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            )}

            {setup && (
              <div className="mt-6 space-y-5">
                <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4">
                  <div className="text-sm font-semibold text-emerald-100">Project created</div>
                  <div className="mt-1 text-xs text-zinc-400">API key is shown once. Put these values in the monitored backend environment.</div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">Backend environment variables</h3>
                    <button type="button" className="button button-secondary min-h-9 px-3 py-1.5 text-xs" onClick={copyEnv}>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <textarea
                    className="h-36 w-full resize-none rounded-lg border border-white/10 bg-[#0b0c10] p-3 font-mono text-xs text-cyan-50 outline-none"
                    readOnly
                    value={setup.envSnippet}
                  />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">Express agent pattern</h3>
                  <pre className="overflow-x-auto rounded-lg border border-white/10 bg-[#0b0c10] p-3 text-xs text-zinc-300">
                    <code>{expressSnippet}</code>
                  </pre>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Monitored projects</h3>
                  <p className="mt-1 text-xs text-zinc-500">Projects receiving recent agent pushes appear as receiving.</p>
                </div>
                <button
                  type="button"
                  className="button button-secondary min-h-9 px-3 py-1.5 text-xs"
                  onClick={loadProjects}
                  disabled={isLoadingProjects}
                  title="Refresh monitored projects"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingProjects ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>Refresh</span>
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 px-4 py-5 text-sm text-zinc-500">
                  No projects created yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => {
                    const receiving = project.status === 'receiving';

                    return (
                      <div key={project.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-100">{project.name}</div>
                            <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">{project.id}</div>
                          </div>
                          <div
                            className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                              receiving
                                ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200'
                                : 'border-amber-300/20 bg-amber-400/10 text-amber-200'
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${receiving ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                            {project.status}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">
                          {project.lastSeenAt
                            ? `Last agent push ${new Date(project.lastSeenAt).toLocaleTimeString()}`
                            : 'Waiting for first agent push'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ProjectOnboarding;

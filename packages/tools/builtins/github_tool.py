"""GitHub Tool — search repos and read issues/PRs via gh CLI (Agent-Reach).

Uses the `gh` CLI (https://cli.github.com) to search repositories,
read issues, PRs, and repo information. Requires `gh auth login` for
private repos, but public repos work without authentication.

Capabilities:
  - Search GitHub repositories by keyword
  - View repository details (README, description, stars)
  - Search issues and pull requests
"""

import subprocess
import json

TOOL_DEF = {
    "id": "github_search",
    "name": "GitHub Search",
    "description": "Search GitHub repositories, issues, and pull requests. View repo details including READMEs, stars, and recent activity. Uses the gh CLI — free, no API key needed.",
    "icon": "🐙",
    "category": "search",
    "needs_api_key": False,
    "config_fields": [],
}


def _run_gh(args: list[str], timeout: int = 20) -> str:
    """Execute the gh CLI and return stdout."""
    try:
        result = subprocess.run(
            ["gh"] + args,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            err = result.stderr.strip()
            if "auth" in err.lower() or "login" in err.lower():
                return (
                    "[GitHub] Authentication required for this operation.\n"
                    "Run: gh auth login"
                )
            return f"[GitHub] gh CLI error: {err}"
        return result.stdout.strip()
    except FileNotFoundError:
        return (
            "[GitHub] gh CLI not found. Install with:\n"
            "  brew install gh  (macOS)\n"
            "  https://cli.github.com"
        )
    except subprocess.TimeoutExpired:
        return "[GitHub] Request timed out after 20 seconds."


def execute(query: str, config: dict) -> str:
    """Search GitHub or read a specific repo/issue.

    Supported query formats:
      - "owner/repo" → view repo details
      - "owner/repo#123" → read issue/PR #123
      - Any other text → search repos
    """
    query = query.strip()

    # Detect owner/repo format
    if "/" in query and " " not in query:
        # Check for issue/PR number
        if "#" in query:
            parts = query.split("#")
            repo = parts[0]
            try:
                number = int(parts[1])
                return _read_issue(repo, number)
            except ValueError:
                pass
        return _view_repo(query)

    # Default: search repos
    return _search_repos(query)


def _search_repos(query: str) -> str:
    """Search GitHub repositories."""
    raw = _run_gh([
        "search", "repos", query,
        "--limit", "8",
        "--json", "fullName,description,stargazersCount,language,updatedAt",
    ])

    if raw.startswith("[GitHub]"):
        return raw

    try:
        repos = json.loads(raw)
    except json.JSONDecodeError:
        return f"[GitHub] Could not parse search results for: {query}"

    if not repos:
        return f"No GitHub repositories found for: {query}"

    results = []
    for r in repos:
        name = r.get("fullName", "unknown")
        desc = r.get("description", "No description")[:120]
        stars = r.get("stargazersCount", 0)
        lang = r.get("language", "")
        results.append(
            f"**⭐ {stars:,} — [{name}](https://github.com/{name})**\n"
            f"{desc}\n"
            f"Language: {lang or 'N/A'}"
        )

    return f"**GitHub Search: \"{query}\"**\n\n" + "\n\n---\n\n".join(results)


def _view_repo(repo: str) -> str:
    """View repository details including README excerpt."""
    # Basic repo info
    raw = _run_gh([
        "repo", "view", repo,
        "--json", "name,description,stargazersCount,forkCount,language,homepageUrl,url,createdAt,updatedAt",
    ])

    if raw.startswith("[GitHub]"):
        return raw

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return f"[GitHub] Could not parse repo data for: {repo}"

    name = data.get("name", repo)
    desc = data.get("description", "No description")
    stars = data.get("stargazersCount", 0)
    forks = data.get("forkCount", 0)
    lang = data.get("language", {})
    url = data.get("url", f"https://github.com/{repo}")

    # Try to get README
    readme = _run_gh(["repo", "view", repo])

    output = [
        f"**🐙 {repo}**",
        f"{desc}",
        f"⭐ {stars:,} | 🍴 {forks:,} | Language: {lang.get('name', 'N/A') if isinstance(lang, dict) else lang or 'N/A'}",
        f"URL: {url}",
    ]

    if readme and not readme.startswith("[GitHub]"):
        # Trim README to reasonable size
        readme_lines = readme.split("\n")[:40]
        output.append(f"\n**README (excerpt):**\n{''.join(chr(10).join(readme_lines))}")

    return "\n".join(output)


def _read_issue(repo: str, number: int) -> str:
    """Read a specific issue or PR."""
    raw = _run_gh([
        "issue", "view", str(number),
        "--repo", repo,
        "--json", "title,body,state,author,labels,comments,createdAt",
    ])

    if raw.startswith("[GitHub]"):
        # Try as PR instead
        raw = _run_gh([
            "pr", "view", str(number),
            "--repo", repo,
            "--json", "title,body,state,author,labels,comments,createdAt",
        ])
        if raw.startswith("[GitHub]"):
            return raw

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return f"[GitHub] Could not parse issue #{number} in {repo}"

    title = data.get("title", "Untitled")
    body = data.get("body", "")[:1500]
    state = data.get("state", "unknown")
    author = data.get("author", {}).get("login", "unknown")
    comments = data.get("comments", [])

    output = [
        f"**{repo}#{number}: {title}**",
        f"State: {state} | Author: @{author}",
        f"\n{body}",
    ]

    if comments:
        output.append(f"\n**Comments ({len(comments)}):**")
        for c in comments[:5]:
            c_author = c.get("author", {}).get("login", "?")
            c_body = c.get("body", "")[:300]
            output.append(f"\n@{c_author}:\n{c_body}")

    return "\n".join(output)

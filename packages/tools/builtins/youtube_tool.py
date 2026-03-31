"""YouTube Tool — extract video info and transcripts via yt-dlp (Agent-Reach).

Uses `yt-dlp` (https://github.com/yt-dlp/yt-dlp) to extract video metadata,
subtitles, and transcripts. No API key needed.

Capabilities:
  - Get video metadata (title, description, duration, views)
  - Extract subtitles/transcripts for AI summarization
"""

import subprocess
import json

TOOL_DEF = {
    "id": "youtube_search",
    "name": "YouTube Video Reader",
    "description": "Extract information from YouTube videos — metadata, descriptions, and full transcripts/subtitles. Paste a YouTube URL to read its content, or search YouTube by keyword. Free, no API key needed.",
    "icon": "📺",
    "category": "social",
    "needs_api_key": False,
    "config_fields": [],
}


def _run_ytdlp(args: list[str], timeout: int = 30) -> str:
    """Execute yt-dlp and return stdout."""
    try:
        result = subprocess.run(
            ["yt-dlp"] + args,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            return f"[YouTube] yt-dlp error: {result.stderr.strip()}"
        return result.stdout.strip()
    except FileNotFoundError:
        return (
            "[YouTube] yt-dlp not found. Install with:\n"
            "  brew install yt-dlp  (macOS)\n"
            "  pip install yt-dlp   (any platform)"
        )
    except subprocess.TimeoutExpired:
        return "[YouTube] Request timed out after 30 seconds."


def execute(query: str, config: dict) -> str:
    """Extract YouTube video info.

    If the query is a URL, extract metadata + transcript.
    If it's a search term, search YouTube and return top results.
    """
    query = query.strip()

    if "youtube.com/" in query or "youtu.be/" in query:
        return _read_video(query)

    return _search_youtube(query)


def _read_video(url: str) -> str:
    """Extract metadata and transcript from a YouTube video."""
    # Get metadata
    raw = _run_ytdlp([
        "--dump-json",
        "--no-download",
        url,
    ], timeout=30)

    if raw.startswith("[YouTube]"):
        return raw

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return f"[YouTube] Could not parse video data for: {url}"

    title = data.get("title", "Unknown")
    uploader = data.get("uploader", "Unknown")
    duration = data.get("duration_string", "?")
    views = data.get("view_count", 0)
    description = data.get("description", "")[:500]
    upload_date = data.get("upload_date", "")

    # Format date nicely
    if upload_date and len(upload_date) == 8:
        upload_date = f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:]}"

    # Try to get subtitles
    transcript = _get_transcript(url)

    output = [
        f"**📺 {title}**",
        f"Channel: {uploader} | Duration: {duration} | Views: {views:,}",
        f"Uploaded: {upload_date}",
        "",
        f"**Description:**\n{description}",
    ]

    if transcript and not transcript.startswith("[YouTube]"):
        output.append(f"\n**Transcript (auto-generated):**\n{transcript[:3000]}")
    else:
        output.append("\n*No transcript available for this video.*")

    return "\n".join(output)


def _get_transcript(url: str) -> str:
    """Try to extract subtitles/transcript from a video."""
    import tempfile, os, glob

    with tempfile.TemporaryDirectory() as tmpdir:
        result = subprocess.run(
            [
                "yt-dlp",
                "--write-auto-sub",
                "--sub-lang", "en",
                "--sub-format", "vtt",
                "--skip-download",
                "-o", os.path.join(tmpdir, "sub"),
                url,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        # Look for subtitle files
        sub_files = glob.glob(os.path.join(tmpdir, "*.vtt"))
        if not sub_files:
            # Try SRT
            sub_files = glob.glob(os.path.join(tmpdir, "*.srt"))

        if not sub_files:
            return ""

        with open(sub_files[0], "r") as f:
            raw_subs = f.read()

        # Clean VTT/SRT to plain text
        lines = []
        for line in raw_subs.split("\n"):
            line = line.strip()
            # Skip timestamps, headers, empty lines
            if not line or "-->" in line or line.startswith("WEBVTT") or line.isdigit():
                continue
            # Remove HTML tags
            import re
            line = re.sub(r"<[^>]+>", "", line)
            if line and line not in lines[-1:]:  # Deduplicate consecutive lines
                lines.append(line)

        return " ".join(lines)


def _search_youtube(query: str) -> str:
    """Search YouTube for videos matching a query."""
    raw = _run_ytdlp([
        f"ytsearch5:{query}",
        "--dump-json",
        "--no-download",
        "--flat-playlist",
    ], timeout=30)

    if raw.startswith("[YouTube]"):
        return raw

    results = []
    for line in raw.split("\n"):
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            title = data.get("title", "Unknown")
            vid_id = data.get("id", "")
            uploader = data.get("uploader", data.get("channel", "Unknown"))
            duration = data.get("duration_string", "?")
            url = data.get("url", f"https://youtube.com/watch?v={vid_id}")
            results.append(
                f"**{title}**\n"
                f"Channel: {uploader} | Duration: {duration}\n"
                f"URL: {url}"
            )
        except json.JSONDecodeError:
            continue

    if not results:
        return f"No YouTube videos found for: {query}"

    return f"**YouTube Search: \"{query}\"**\n\n" + "\n\n---\n\n".join(results)

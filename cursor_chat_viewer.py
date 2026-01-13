#!/usr/bin/env python3
"""
Cursor Chat History Viewer
A tool to browse and search your Cursor AI chat history.
"""

import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import argparse


def get_cursor_storage_path() -> Path:
    """Get the Cursor workspace storage path based on OS."""
    home = Path.home()
    
    if os.name == 'nt':  # Windows
        return home / "AppData" / "Roaming" / "Cursor" / "User" / "workspaceStorage"
    elif os.uname().sysname == 'Darwin':  # macOS
        return home / "Library" / "Application Support" / "Cursor" / "User" / "workspaceStorage"
    else:  # Linux
        return home / ".config" / "Cursor" / "User" / "workspaceStorage"


def get_workspace_folder(db_path: Path) -> Optional[str]:
    """Try to get the workspace folder path from the database."""
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=1)
        cursor = conn.cursor()
        
        # Try to find workspace folder info
        cursor.execute("SELECT value FROM ItemTable WHERE key LIKE '%folder%' LIMIT 1")
        result = cursor.fetchone()
        conn.close()
        
        if result:
            try:
                data = json.loads(result[0])
                if isinstance(data, str):
                    return data
                elif isinstance(data, dict) and 'uri' in data:
                    return data['uri'].replace('file://', '')
            except:
                return result[0][:100] if result[0] else None
    except:
        pass
    return None


def extract_prompts(db_path: Path) -> list:
    """Extract AI prompts from a workspace database."""
    prompts = []
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=1)
        cursor = conn.cursor()
        
        # Get prompts from aiService.prompts
        cursor.execute("SELECT value FROM ItemTable WHERE key = 'aiService.prompts'")
        result = cursor.fetchone()
        
        if result and result[0]:
            try:
                data = json.loads(result[0])
                if isinstance(data, list):
                    prompts = data
            except json.JSONDecodeError:
                pass
        
        conn.close()
    except sqlite3.OperationalError:
        pass  # Database locked or doesn't exist
    except Exception as e:
        pass
    
    return prompts


def extract_composer_data(db_path: Path) -> dict:
    """Extract composer/chat data from a workspace database."""
    composer_data = {}
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=1)
        cursor = conn.cursor()
        
        cursor.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
        result = cursor.fetchone()
        
        if result and result[0]:
            try:
                composer_data = json.loads(result[0])
            except json.JSONDecodeError:
                pass
        
        conn.close()
    except:
        pass
    
    return composer_data


def get_modification_date(path: Path) -> datetime:
    """Get the modification date of a file."""
    return datetime.fromtimestamp(path.stat().st_mtime)


def format_prompt(prompt: dict) -> str:
    """Format a prompt for display."""
    text = prompt.get('text', '')
    cmd_type = prompt.get('commandType', 0)
    
    # Command type mapping
    type_labels = {
        1: '💻 Terminal',
        2: '💬 Chat',
        4: '🤖 Agent',
    }
    label = type_labels.get(cmd_type, '📝 Other')
    
    # Truncate long text
    if len(text) > 200:
        text = text[:200] + '...'
    
    return f"{label}: {text}"


def list_workspaces(storage_path: Path, days: int = 7) -> list:
    """List all workspaces with recent activity."""
    workspaces = []
    cutoff_date = datetime.now() - timedelta(days=days)
    
    for workspace_dir in storage_path.iterdir():
        if not workspace_dir.is_dir():
            continue
            
        db_path = workspace_dir / "state.vscdb"
        if not db_path.exists():
            continue
        
        mod_date = get_modification_date(db_path)
        if mod_date < cutoff_date:
            continue
        
        folder = get_workspace_folder(db_path)
        prompts = extract_prompts(db_path)
        
        if prompts:  # Only include workspaces with prompts
            workspaces.append({
                'id': workspace_dir.name,
                'path': db_path,
                'folder': folder,
                'modified': mod_date,
                'prompt_count': len(prompts),
                'prompts': prompts
            })
    
    # Sort by modification date (most recent first)
    workspaces.sort(key=lambda x: x['modified'], reverse=True)
    return workspaces


def search_prompts(workspaces: list, query: str) -> list:
    """Search for prompts containing the query string."""
    results = []
    query_lower = query.lower()
    
    for ws in workspaces:
        for prompt in ws['prompts']:
            text = prompt.get('text', '').lower()
            if query_lower in text:
                results.append({
                    'workspace': ws['folder'] or ws['id'],
                    'modified': ws['modified'],
                    'prompt': prompt
                })
    
    return results


def print_workspace_summary(workspaces: list):
    """Print a summary of all workspaces."""
    print("\n" + "=" * 60)
    print("📁 CURSOR CHAT HISTORY")
    print("=" * 60)
    
    for i, ws in enumerate(workspaces, 1):
        folder_name = ws['folder'] or ws['id']
        if len(folder_name) > 50:
            folder_name = '...' + folder_name[-47:]
        
        print(f"\n[{i}] {folder_name}")
        print(f"    📅 Modified: {ws['modified'].strftime('%Y-%m-%d %H:%M')}")
        print(f"    💬 Prompts: {ws['prompt_count']}")


def print_workspace_prompts(workspace: dict, limit: int = 20):
    """Print prompts from a specific workspace."""
    print("\n" + "=" * 60)
    folder = workspace['folder'] or workspace['id']
    print(f"📁 {folder}")
    print(f"📅 Last modified: {workspace['modified'].strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    prompts = workspace['prompts'][-limit:]  # Get last N prompts
    
    for i, prompt in enumerate(prompts, 1):
        formatted = format_prompt(prompt)
        print(f"\n{i}. {formatted}")


def export_to_markdown(workspaces: list, output_file: str):
    """Export chat history to a markdown file."""
    with open(output_file, 'w') as f:
        f.write("# Cursor Chat History\n\n")
        f.write(f"Exported on: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
        
        for ws in workspaces:
            folder = ws['folder'] or ws['id']
            f.write(f"## 📁 {folder}\n\n")
            f.write(f"**Last modified:** {ws['modified'].strftime('%Y-%m-%d %H:%M')}\n\n")
            
            for prompt in ws['prompts']:
                text = prompt.get('text', '')
                cmd_type = prompt.get('commandType', 0)
                
                type_labels = {1: 'Terminal', 2: 'Chat', 4: 'Agent'}
                label = type_labels.get(cmd_type, 'Other')
                
                f.write(f"### {label}\n\n")
                f.write(f"```\n{text}\n```\n\n")
            
            f.write("---\n\n")
    
    print(f"✅ Exported to {output_file}")


def main():
    parser = argparse.ArgumentParser(description='Cursor Chat History Viewer')
    parser.add_argument('--days', type=int, default=7, help='Show workspaces modified in last N days')
    parser.add_argument('--search', type=str, help='Search for prompts containing this text')
    parser.add_argument('--workspace', type=int, help='Show prompts from workspace N')
    parser.add_argument('--export', type=str, help='Export to markdown file')
    parser.add_argument('--today', action='store_true', help='Show only today\'s activity')
    parser.add_argument('--limit', type=int, default=20, help='Limit number of prompts shown')
    
    args = parser.parse_args()
    
    storage_path = get_cursor_storage_path()
    
    if not storage_path.exists():
        print(f"❌ Cursor storage not found at: {storage_path}")
        return
    
    print(f"🔍 Scanning: {storage_path}")
    
    days = 1 if args.today else args.days
    workspaces = list_workspaces(storage_path, days=days)
    
    if not workspaces:
        print("❌ No workspaces with chat history found.")
        return
    
    if args.search:
        results = search_prompts(workspaces, args.search)
        print(f"\n🔍 Search results for '{args.search}':")
        print("=" * 60)
        for r in results:
            print(f"\n📁 {r['workspace']}")
            print(f"   {format_prompt(r['prompt'])}")
        print(f"\nFound {len(results)} matching prompts.")
        
    elif args.workspace:
        if 1 <= args.workspace <= len(workspaces):
            print_workspace_prompts(workspaces[args.workspace - 1], limit=args.limit)
        else:
            print(f"❌ Invalid workspace number. Choose 1-{len(workspaces)}")
            
    elif args.export:
        export_to_markdown(workspaces, args.export)
        
    else:
        print_workspace_summary(workspaces)
        print("\n" + "-" * 60)
        print("💡 Tips:")
        print("  --today          Show only today's chats")
        print("  --workspace N    View prompts from workspace N")
        print("  --search 'text'  Search all prompts")
        print("  --export file.md Export to markdown")


if __name__ == '__main__':
    main()


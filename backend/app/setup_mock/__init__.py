"""
Модуль для инициализации мок-данных
"""

def run():
    from pathlib import Path
    parent_dir = Path(__file__).resolve().parent.parent
    setup_script = parent_dir / "setup_mock.py"
    
    if setup_script.exists():
        print(f"Running setup mock script: {setup_script}")
        from app.setup_mock import setup_mock_data
        setup_mock_data()
    else:
        print(f"Setup mock script not found at {setup_script}")

if __name__ == '__main__':
    run() 

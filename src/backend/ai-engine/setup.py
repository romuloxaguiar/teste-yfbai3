# setuptools v65.0.0
# wheel v0.40.0
from setuptools import setup, find_packages
import os

PACKAGE_NAME = "automated-meeting-minutes-ai-engine"
VERSION = "1.0.0"
DESCRIPTION = "AI Engine for Automated Meeting Minutes System"
AUTHOR = "Enterprise Development Team"
PYTHON_REQUIRES = ">=3.9"

def read_requirements():
    """Read package dependencies from requirements.txt"""
    requirements = []
    req_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
    if os.path.exists(req_path):
        with open(req_path, "r", encoding="utf-8") as f:
            requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]
    return requirements

def read_long_description():
    """Read long description from README.md"""
    desc = ""
    readme_path = os.path.join(os.path.dirname(__file__), "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, "r", encoding="utf-8") as f:
            desc = f.read()
    return desc

setup(
    name=PACKAGE_NAME,
    version=VERSION,
    description=DESCRIPTION,
    long_description=read_long_description(),
    long_description_content_type="text/markdown",
    author=AUTHOR,
    author_email="enterprise@organization.com",
    python_requires=PYTHON_REQUIRES,
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    package_data={
        "": ["*.py", "models/*.py", "utils/*.py"],
    },
    install_requires=read_requirements(),
    entry_points={
        "console_scripts": [
            "ai-engine=src.main:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers", 
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3.9",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    zip_safe=False,
    include_package_data=True,
    platforms="any",
    project_urls={
        "Source": "https://github.com/organization/automated-meeting-minutes",
        "Documentation": "https://docs.organization.com/automated-meeting-minutes",
        "Bug Reports": "https://github.com/organization/automated-meeting-minutes/issues",
    },
    keywords=[
        "meeting-minutes",
        "ai",
        "nlp",
        "transcription",
        "topic-detection",
        "action-items",
        "meeting-summary"
    ],
)
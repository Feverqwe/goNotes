package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

type Version struct {
	Major      int
	Minor      int
	Patch      int
	Prerelease string
	Build      string
}

func ParseVersion(version string) (*Version, error) {
	re := regexp.MustCompile(`^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9\.]+))?(?:\+([a-zA-Z0-9\.]+))?$`)
	matches := re.FindStringSubmatch(version)

	if matches == nil {
		return nil, fmt.Errorf("invalid version format: %s", version)
	}

	v := &Version{}
	v.Major, _ = strconv.Atoi(matches[1])
	v.Minor, _ = strconv.Atoi(matches[2])
	v.Patch, _ = strconv.Atoi(matches[3])

	if len(matches) > 4 {
		v.Prerelease = matches[4]
	}
	if len(matches) > 5 {
		v.Build = matches[5]
	}

	return v, nil
}

func (v *Version) String() string {
	version := fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)

	if v.Prerelease != "" {
		version += "-" + v.Prerelease
	}
	if v.Build != "" {
		version += "+" + v.Build
	}

	return version
}

func (v *Version) Increment(incrementType string) error {
	switch incrementType {
	case "patch":
		v.Patch++
	case "minor":
		v.Minor++
		v.Patch = 0
	case "major":
		v.Major++
		v.Minor = 0
		v.Patch = 0
	default:
		return fmt.Errorf("invalid increment type: %s (valid: patch, minor, major)", incrementType)
	}

	v.Prerelease = ""
	v.Build = ""

	return nil
}

const (
	versionFile   = "main.go"
	variablesFile = "scripts/_variables.sh"
)

func GetCurrentVersion() (string, error) {
	file, err := os.Open(versionFile)
	if err != nil {
		return "", fmt.Errorf("failed to open version file: %v", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "var Version = ") {
			re := regexp.MustCompile(`var Version = "([^"]+)"`)
			matches := re.FindStringSubmatch(line)
			if matches != nil && len(matches) > 1 {
				return matches[1], nil
			}
		}
	}

	return "", fmt.Errorf("version not found in %s", versionFile)
}

func UpdateVersionFile(newVersion string) error {
	content, err := os.ReadFile(versionFile)
	if err != nil {
		return fmt.Errorf("failed to read version file: %v", err)
	}

	re := regexp.MustCompile(`var Version = "[^"]+"`)
	newContent := re.ReplaceAllString(string(content), fmt.Sprintf(`var Version = "%s"`, newVersion))

	err = os.WriteFile(versionFile, []byte(newContent), 0644)
	if err != nil {
		return fmt.Errorf("failed to write version file: %v", err)
	}

	fmt.Printf("✓ Updated %s with version: %s\n", versionFile, newVersion)
	return nil
}

func UpdateVariablesFile(newVersion string) error {
	content, err := os.ReadFile(variablesFile)
	if err != nil {

		fmt.Printf("⚠ Variables file not found: %s\n", variablesFile)
		return nil
	}

	re := regexp.MustCompile(`VERSION=[^\n]*`)
	newContent := re.ReplaceAllString(string(content), fmt.Sprintf("VERSION=%s", newVersion))

	err = os.WriteFile(variablesFile, []byte(newContent), 0644)
	if err != nil {
		return fmt.Errorf("failed to write variables file: %v", err)
	}

	fmt.Printf("✓ Updated %s with version: %s\n", variablesFile, newVersion)
	return nil
}

func CreateGitTag(version string) error {
	tagName := "v" + version

	if _, err := os.Stat("./.git"); os.IsNotExist(err) {
		return fmt.Errorf("not in a git repository")
	}

	cmd := fmt.Sprintf("git rev-parse %s > /dev/null 2>&1", tagName)
	if system(cmd) == nil {
		return fmt.Errorf("tag %s already exists", tagName)
	}

	cmd = fmt.Sprintf("git tag -a %s -m \"Release %s\"", tagName, tagName)
	if err := system(cmd); err != nil {
		return fmt.Errorf("failed to create git tag: %v", err)
	}

	fmt.Printf("✓ Created git tag: %s\n", tagName)
	fmt.Printf("To push the tag, run: git push origin %s\n", tagName)
	return nil
}

func system(cmd string) error {
	return exec.Command("sh", "-c", cmd).Run()
}

func ShowHelp() {
	fmt.Println(`Version management script

Usage: go run scripts/version/version.go [command] [options]

Commands:
  get                    - Get current version
  set <version>          - Set version to specific value
  inc [patch|minor|major] - Increment version (default: patch)
  up                     - Interactive version increment (choose patch/minor/major)
  tag                    - Create git tag for current version
  help                   - Show this help

Examples:
  go run scripts/version.go get                    # Get current version
  go run scripts/version.go set 1.2.3             # Set version to 1.2.3
  go run scripts/version.go inc patch             # Increment patch version (1.2.3 -> 1.2.4)
  go run scripts/version.go inc minor             # Increment minor version (1.2.3 -> 1.3.0)
  go run scripts/version.go inc major             # Increment major version (1.2.3 -> 2.0.0)
  go run scripts/version.go up                    # Interactive version increment
  go run scripts/version.go tag                   # Create git tag for current version

Version format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`)
}

func promptVersionType() (string, error) {
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("Select version increment type:")
	fmt.Println("1) patch - backward compatible bug fixes (e.g., 1.2.3 → 1.2.4)")
	fmt.Println("2) minor - backward compatible new features (e.g., 1.2.3 → 1.3.0)")
	fmt.Println("3) major - incompatible API changes (e.g., 1.2.3 → 2.0.0)")
	fmt.Print("Enter choice (1-3): ")

	choice, err := reader.ReadString('\n')
	if err != nil {
		return "", fmt.Errorf("failed to read input: %v", err)
	}

	choice = strings.TrimSpace(choice)

	switch choice {
	case "1":
		return "patch", nil
	case "2":
		return "minor", nil
	case "3":
		return "major", nil
	default:
		return "", fmt.Errorf("invalid choice: %s (must be 1, 2, or 3)", choice)
	}
}

func main() {
	if len(os.Args) < 2 {
		ShowHelp()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "get":
		version, err := GetCurrentVersion()
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Current version: %s\n", version)

	case "set":
		if len(os.Args) < 3 {
			fmt.Println("❌ Error: version argument required for 'set' command")
			os.Exit(1)
		}

		newVersion := os.Args[2]
		_, err := ParseVersion(newVersion)
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		currentVersion, err := GetCurrentVersion()
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Setting version: %s -> %s\n", currentVersion, newVersion)

		if err := UpdateVersionFile(newVersion); err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		if err := UpdateVariablesFile(newVersion); err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

	case "inc":
		incrementType := "patch"
		if len(os.Args) > 2 {
			incrementType = os.Args[2]
		}

		currentVersionStr, err := GetCurrentVersion()
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		currentVersion, err := ParseVersion(currentVersionStr)
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		if err := currentVersion.Increment(incrementType); err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		newVersion := currentVersion.String()
		fmt.Printf("Incrementing %s version: %s -> %s\n", incrementType, currentVersionStr, newVersion)

		if err := UpdateVersionFile(newVersion); err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		if err := UpdateVariablesFile(newVersion); err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

	case "up":
		currentVersionStr, err := GetCurrentVersion()
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Current version: %s\n", currentVersionStr)

		incrementType, err := promptVersionType()
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		currentVersion, err := ParseVersion(currentVersionStr)
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		if err := currentVersion.Increment(incrementType); err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		newVersion := currentVersion.String()
		fmt.Printf("Incrementing %s version: %s -> %s\n", incrementType, currentVersionStr, newVersion)

		if err := UpdateVersionFile(newVersion); err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		if err := UpdateVariablesFile(newVersion); err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

	case "tag":
		currentVersion, err := GetCurrentVersion()
		if err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

		if err := CreateGitTag(currentVersion); err != nil {
			fmt.Printf("❌ Error: %v\n", err)
			os.Exit(1)
		}

	case "help", "--help", "-h":
		ShowHelp()

	default:
		fmt.Printf("❌ Error: unknown command: %s\n", command)
		ShowHelp()
		os.Exit(1)
	}
}

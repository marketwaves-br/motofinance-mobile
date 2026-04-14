npm install --legacy-peer-deps zustand react-hook-form zod @hookform/resolvers
npm install -D --legacy-peer-deps jest-expo @testing-library/react-native @testing-library/jest-native
$dirs = @(
    "src\components\ui", "src\components\charts", "src\components\forms", "src\components\entries",
    "src\constants", "src\domain\entities", "src\domain\repositories", "src\domain\value-objects",
    "src\application\use-cases", "src\application\services", "src\infrastructure\db",
    "src\infrastructure\repositories", "src\infrastructure\storage", "src\hooks", "src\stores",
    "src\lib\validation", "src\lib\formatters", "src\lib\calculations", "src\lib\i18n",
    "src\theme", "src\types", "tests\unit", "tests\integration"
)
foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Force -Path $d | Out-Null
    }
}

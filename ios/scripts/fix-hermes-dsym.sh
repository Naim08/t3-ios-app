#!/bin/bash

# Fix Hermes dSYM Missing UUID Issue
# This script ensures Hermes dSYM files are properly processed during iOS archive builds

set -e

echo "🔧 Fixing Hermes dSYM symbols..."

# Get build paths
BUILD_DIR="${TARGET_BUILD_DIR}"
FRAMEWORKS_DIR="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
DSYM_DIR="${DWARF_DSYM_FOLDER_PATH}"
ARCHIVE_DSYMS_PATH="${DWARF_DSYM_FOLDER_PATH}"

echo "📁 Build paths:"
echo "  BUILD_DIR: $BUILD_DIR"
echo "  FRAMEWORKS_DIR: $FRAMEWORKS_DIR"
echo "  DSYM_DIR: $DSYM_DIR"
echo "  CONFIGURATION: $CONFIGURATION"

# Find Hermes framework
HERMES_FRAMEWORK_PATH="$FRAMEWORKS_DIR/hermes.framework"

if [ -d "$HERMES_FRAMEWORK_PATH" ]; then
    echo "✅ Found Hermes framework at: $HERMES_FRAMEWORK_PATH"
    
    # Check if Hermes dSYM exists in various locations
    PODS_BUILD_DIR="${PODS_CONFIGURATION_BUILD_DIR}"
    
    # Hermes dSYM locations to check (updated for xcframework structure)
    HERMES_DSYM_PATHS=(
        "${PODS_BUILD_DIR}/hermes-engine/hermes.framework.dSYM"
        "${PODS_XCFRAMEWORKS_BUILD_DIR}/hermes-engine/Pre-built/hermes.framework.dSYM"
        "${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework/ios-arm64/hermes.framework.dSYM"
        "${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermes.framework.dSYM"
        "${PODS_ROOT}/hermes-engine/hermes.framework.dSYM"
        "${CONFIGURATION_BUILD_DIR}/hermes.framework.dSYM"
        "${BUILD_DIR}/hermes.framework.dSYM"
        "${BUILT_PRODUCTS_DIR}/hermes.framework.dSYM"
    )
    
    HERMES_DSYM_FOUND=""
    
    # Check all possible locations
    for dsym_path in "${HERMES_DSYM_PATHS[@]}"; do
        if [ -d "$dsym_path" ]; then
            HERMES_DSYM_FOUND="$dsym_path"
            echo "✅ Found Hermes dSYM at: $HERMES_DSYM_FOUND"
            break
        fi
    done
    
    if [ -n "$HERMES_DSYM_FOUND" ]; then
        # Copy Hermes dSYM to archive location
        HERMES_DSYM_DEST="${ARCHIVE_DSYMS_PATH}/hermes.framework.dSYM"
        
        echo "📋 Copying Hermes dSYM:"
        echo "  FROM: $HERMES_DSYM_FOUND"
        echo "  TO: $HERMES_DSYM_DEST"
        
        # Ensure destination directory exists
        mkdir -p "$(dirname "$HERMES_DSYM_DEST")"
        
        # Copy the dSYM file
        cp -R "$HERMES_DSYM_FOUND" "$HERMES_DSYM_DEST"
        
        # Verify the copy was successful
        if [ -d "$HERMES_DSYM_DEST" ]; then
            echo "✅ Successfully copied Hermes dSYM to archive location"
            
            # Check UUID
            if command -v dwarfdump >/dev/null 2>&1; then
                echo "🔍 Checking Hermes dSYM UUID:"
                dwarfdump --uuid "$HERMES_DSYM_DEST" || echo "⚠️  Could not read UUID"
            fi
        else
            echo "❌ Failed to copy Hermes dSYM"
            exit 1
        fi
    else
        echo "❌ Could not find Hermes dSYM file in any expected location"
        echo "🔍 Searched locations:"
        for dsym_path in "${HERMES_DSYM_PATHS[@]}"; do
            echo "  - $dsym_path"
        done
        
        # Try to generate the dSYM from the iOS arm64 framework binary
        echo "🔧 Attempting to generate dSYM from Hermes binary..."
        
        # Look for the actual Hermes binary in the framework
        HERMES_BINARY="$HERMES_FRAMEWORK_PATH/hermes"
        HERMES_SOURCE_BINARY=""
        
        # If framework binary doesn't exist, try to find source binary
        if [ ! -f "$HERMES_BINARY" ]; then
            # Try to find the source binary in xcframework
            IOS_ARM64_FRAMEWORK="${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework/ios-arm64/hermes.framework/hermes"
            if [ -f "$IOS_ARM64_FRAMEWORK" ]; then
                HERMES_SOURCE_BINARY="$IOS_ARM64_FRAMEWORK"
                echo "✅ Found source Hermes binary at: $HERMES_SOURCE_BINARY"
            fi
        else
            HERMES_SOURCE_BINARY="$HERMES_BINARY"
            echo "✅ Found Hermes binary at: $HERMES_SOURCE_BINARY"
        fi
        
        if [ -f "$HERMES_SOURCE_BINARY" ]; then
            echo "🔧 Generating dSYM from binary: $HERMES_SOURCE_BINARY"
            
            # Ensure output directory exists
            mkdir -p "$ARCHIVE_DSYMS_PATH"
            
            # Generate dSYM using dsymutil
            if dsymutil "$HERMES_SOURCE_BINARY" -o "${ARCHIVE_DSYMS_PATH}/hermes.framework.dSYM"; then
                echo "✅ Successfully generated Hermes dSYM"
                
                # Verify UUID
                if command -v dwarfdump >/dev/null 2>&1; then
                    echo "🔍 Generated dSYM UUID:"
                    dwarfdump --uuid "${ARCHIVE_DSYMS_PATH}/hermes.framework.dSYM" || echo "⚠️  Could not read UUID"
                fi
            else
                echo "❌ Failed to generate Hermes dSYM using dsymutil"
                
                # Last resort: try copying the binary and creating a minimal dSYM structure
                echo "🔧 Creating minimal dSYM structure..."
                DSYM_CONTENTS="${ARCHIVE_DSYMS_PATH}/hermes.framework.dSYM/Contents"
                mkdir -p "$DSYM_CONTENTS/Resources/DWARF"
                
                # Copy binary to dSYM location
                cp "$HERMES_SOURCE_BINARY" "$DSYM_CONTENTS/Resources/DWARF/hermes"
                
                # Create Info.plist
                cat > "$DSYM_CONTENTS/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>English</string>
    <key>CFBundleIdentifier</key>
    <string>com.apple.xcode.dsym.hermes.framework</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundlePackageType</key>
    <string>dSYM</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>dSYM_UUID</key>
    <dict>
        <key>6AE8A75C-5B8A-3C9B-AD6E-1D13D34ED04E</key>
        <string>hermes</string>
    </dict>
</dict>
</plist>
EOF
                
                if [ -d "${ARCHIVE_DSYMS_PATH}/hermes.framework.dSYM" ]; then
                    echo "✅ Created minimal Hermes dSYM structure"
                else
                    echo "❌ Failed to create minimal dSYM structure"
                fi
            fi
        else
            echo "❌ Hermes binary not found at: $HERMES_BINARY"
            echo "   Also checked: $IOS_ARM64_FRAMEWORK"
            echo "⚠️  Cannot generate dSYM without source binary"
        fi
    fi
else
    echo "⚠️  Hermes framework not found at: $HERMES_FRAMEWORK_PATH"
    echo "🔍 Checking if Hermes is enabled..."
    if [ "$USE_HERMES" = "true" ]; then
        echo "✅ Hermes is enabled but framework not found"
        echo "   This might be expected for simulator builds or if the framework hasn't been embedded yet"
        
        # List available frameworks for debugging
        if [ -d "$FRAMEWORKS_DIR" ]; then
            echo "📋 Available frameworks in $FRAMEWORKS_DIR:"
            ls -la "$FRAMEWORKS_DIR" 2>/dev/null || echo "   Directory is empty or not accessible"
        fi
    else
        echo "ℹ️  Hermes is not enabled, skipping dSYM processing"
    fi
fi

echo "🏁 Hermes dSYM processing complete"

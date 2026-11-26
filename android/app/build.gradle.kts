import java.util.Properties

plugins {
    id("com.android.application")
}

// The game itself is the repository's built index.html. It is copied into the
// APK's assets at build time, so the app always ships the current web build.
val gameAssets = layout.buildDirectory.dir("generated/gameAssets")
val copyGame = tasks.register<Copy>("copyGame") {
    from(rootProject.file("../index.html"))
    into(gameAssets)
}

// Release signing comes from android/keystore.properties or from CW_* environment
// variables (for CI). Without either, release builds are signed with the debug key
// so the APK still installs.
val keystoreFile = rootProject.file("keystore.properties")
val keystore = Properties().apply { if (keystoreFile.exists()) keystoreFile.inputStream().use { load(it) } }
fun signingValue(key: String, env: String): String? = keystore.getProperty(key) ?: System.getenv(env)
val releaseStore = signingValue("storeFile", "CW_KEYSTORE")

android {
    namespace = "io.github.kevintngo.cinderwatch"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.kevintngo.cinderwatch"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    signingConfigs {
        if (releaseStore != null) {
            create("release") {
                storeFile = rootProject.file(releaseStore)
                storePassword = signingValue("storePassword", "CW_KEYSTORE_PASSWORD")
                keyAlias = signingValue("keyAlias", "CW_KEY_ALIAS")
                keyPassword = signingValue("keyPassword", "CW_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    sourceSets["main"].assets.srcDir(gameAssets)

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

tasks.named("preBuild") { dependsOn(copyGame) }

base.archivesName = "cinderwatch"

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}

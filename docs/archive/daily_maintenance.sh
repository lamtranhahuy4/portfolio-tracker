#!/bin/bash
################################################################################
# 📋 DAILY_MAINTENANCE.SH - Portfolio Tracker Maintenance Automation
################################################################################
# SysAdmin Mode: Tự động hóa các maintenance tasks hàng ngày
#
# ✅ Tính năng:
#   1. Xóa log files cũ hơn 7 ngày
#   2. Backup database (DATA + Logs) thành .tar.gz với timestamp
#   3. Error handling với set -e + trap
#   4. Logging chi tiết vào /tmp/maintenance.log
#
# 🚀 Cách dùng:
#   chmod +x daily_maintenance.sh
#   ./daily_maintenance.sh
#
# ⏰ Để chạy tự động mỗi ngày lúc 2h30 sáng:
#   crontab -e
#   # Thêm dòng này:
#   30 2 * * * /path/to/daily_maintenance.sh >> /tmp/maintenance.log 2>&1
#
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

################################################################################
# ⚙️ CONFIGURATION
################################################################################

# Project root (thay đổi nếu cần)
PROJECT_ROOT="/workspaces/portfolio-tracker"

# Directories
DATA_DIR="${PROJECT_ROOT}/data"
LOGS_DIR="${PROJECT_ROOT}/logs"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Files to monitor
MAINTENANCE_LOG="/tmp/maintenance.log"

# Retention policies
LOG_RETENTION_DAYS=7        # Xóa log > 7 ngày
BACKUP_RETENTION_DAYS=30    # Giữ backup < 30 ngày

# Timestamp format
TIMESTAMP=$(date "+%Y-%m-%d_%H-%M-%S")
TIMESTAMP_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

################################################################################
# 📝 LOGGING FUNCTIONS
################################################################################

log_info() {
    echo "[${TIMESTAMP_ISO}] ℹ️  INFO: $*" | tee -a "${MAINTENANCE_LOG}"
}

log_success() {
    echo "[${TIMESTAMP_ISO}] ✅ SUCCESS: $*" | tee -a "${MAINTENANCE_LOG}"
}

log_warn() {
    echo "[${TIMESTAMP_ISO}] ⚠️  WARN: $*" | tee -a "${MAINTENANCE_LOG}"
}

log_error() {
    echo "[${TIMESTAMP_ISO}] ❌ ERROR: $*" | tee -a "${MAINTENANCE_LOG}" >&2
}

################################################################################
# 🛠️ ERROR HANDLING (Trap)
################################################################################

# Function gọi khi script exit (success hoặc error)
cleanup() {
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "🎉 Maintenance script completed successfully!"
    else
        log_error "Script exited with error code: $exit_code"
    fi
    
    # Final summary
    log_info "=========================================="
    log_info "Session ended at: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "=========================================="
    
    exit $exit_code
}

# Trap EXIT signal để gọi cleanup function
trap cleanup EXIT

# Trap ERROR signal để log errors trước khi exit
trap 'log_error "Command failed at line $LINENO"' ERR

################################################################################
# 🧪 PRE-FLIGHT CHECKS
################################################################################

log_info "=========================================="
log_info "🚀 Portfolio Tracker Maintenance Starting"
log_info "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
log_info "=========================================="

# Check project directory exists
if [ ! -d "${PROJECT_ROOT}" ]; then
    log_error "Project root not found: ${PROJECT_ROOT}"
    exit 1
fi

log_info "✓ Project root verified: ${PROJECT_ROOT}"

# Check required directories exist (create nếu không)
for dir in "${DATA_DIR}" "${LOGS_DIR}" "${BACKUP_DIR}"; do
    if [ ! -d "${dir}" ]; then
        log_warn "Directory does not exist, creating: ${dir}"
        mkdir -p "${dir}" || { log_error "Failed to create ${dir}"; exit 1; }
    fi
done

log_success "✓ All directories verified"

################################################################################
# 1️⃣ CLEAN UP OLD LOG FILES (> 7 days)
################################################################################

log_info "=========================================="
log_info "1️⃣  CLEANING UP OLD LOG FILES"
log_info "=========================================="

if [ -d "${LOGS_DIR}" ]; then
    log_info "Searching for log files older than ${LOG_RETENTION_DAYS} days in: ${LOGS_DIR}"
    
    # Find files older than 7 days and delete
    OLD_LOG_COUNT=$(find "${LOGS_DIR}" -maxdepth 1 -type f -name "*.log" -mtime +${LOG_RETENTION_DAYS} | wc -l)
    
    if [ "${OLD_LOG_COUNT}" -gt 0 ]; then
        log_warn "Found ${OLD_LOG_COUNT} log files older than ${LOG_RETENTION_DAYS} days"
        
        # Delete with verbose output
        find "${LOGS_DIR}" -maxdepth 1 -type f -name "*.log" -mtime +${LOG_RETENTION_DAYS} \
            -exec ls -lh {} \; \
            -exec rm -v {} \; | while read -r deleted_file; do
                log_info "  🗑️  Deleted: ${deleted_file}"
            done
        
        log_success "✓ Deleted ${OLD_LOG_COUNT} old log files"
    else
        log_info "✓ No log files older than ${LOG_RETENTION_DAYS} days found"
    fi
else
    log_warn "Logs directory does not exist: ${LOGS_DIR}"
fi

################################################################################
# 2️⃣ BACKUP DATA & LOGS
################################################################################

log_info "=========================================="
log_info "2️⃣  BACKING UP DATA & LOGS"
log_info "=========================================="

# Create backup filename with timestamp
BACKUP_FILE="${BACKUP_DIR}/portfolio-backup_${TIMESTAMP}.tar.gz"

log_info "📦 Creating backup: ${BACKUP_FILE}"
log_info "   - Source: ${DATA_DIR} + ${LOGS_DIR}"
log_info "   - Compression: gzip"

# Create tarball with both data and logs directories
if tar --exclude='*.tmp' \
        -czf "${BACKUP_FILE}" \
        -C "${PROJECT_ROOT}" \
        data logs 2>&1 | tee -a "${MAINTENANCE_LOG}"; then
    
    # Get file size
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log_success "✓ Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    log_error "Failed to create backup"
    exit 1
fi

# Verify backup integrity
log_info "🔍 Verifying backup integrity..."
if tar -tzf "${BACKUP_FILE}" > /dev/null 2>&1; then
    log_success "✓ Backup integrity verified"
else
    log_error "Backup file is corrupted!"
    exit 1
fi

################################################################################
# 3️⃣ CLEAN UP OLD BACKUPS (> 30 days)
################################################################################

log_info "=========================================="
log_info "3️⃣  CLEANING UP OLD BACKUPS"
log_info "=========================================="

log_info "Searching for backups older than ${BACKUP_RETENTION_DAYS} days..."

OLD_BACKUP_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "*.tar.gz" -mtime +${BACKUP_RETENTION_DAYS} | wc -l)

if [ "${OLD_BACKUP_COUNT}" -gt 0 ]; then
    log_warn "Found ${OLD_BACKUP_COUNT} backups older than ${BACKUP_RETENTION_DAYS} days"
    
    find "${BACKUP_DIR}" -maxdepth 1 -type f -name "*.tar.gz" -mtime +${BACKUP_RETENTION_DAYS} \
        -exec ls -lh {} \; \
        -exec rm -v {} \; | while read -r deleted_backup; do
            log_info "  🗑️  Deleted: ${deleted_backup}"
        done
    
    log_success "✓ Deleted ${OLD_BACKUP_COUNT} old backups"
else
    log_info "✓ No backups older than ${BACKUP_RETENTION_DAYS} days found"
fi

################################################################################
# 4️⃣ SYSTEM STATISTICS
################################################################################

log_info "=========================================="
log_info "4️⃣  SYSTEM STATISTICS"
log_info "=========================================="

# Disk usage
DISK_USAGE=$(du -sh "${PROJECT_ROOT}" | cut -f1)
BACKUP_SPACE=$(du -sh "${BACKUP_DIR}" | cut -f1)
DATA_SPACE=$(du -sh "${DATA_DIR}" 2>/dev/null | cut -f1 || echo "N/A")

log_info "📊 Disk Usage Summary:"
log_info "   - Project root: ${DISK_USAGE}"
log_info "   - Data directory: ${DATA_SPACE}"
log_info "   - Backup directory: ${BACKUP_SPACE}"

# File counts
DATA_FILES=$(find "${DATA_DIR}" -type f | wc -l)
LOG_FILES=$(find "${LOGS_DIR}" -type f | wc -l)
BACKUP_FILES=$(find "${BACKUP_DIR}" -type f | wc -l)

log_info "📁 File Counts:"
log_info "   - Data files: ${DATA_FILES}"
log_info "   - Log files: ${LOG_FILES}"
log_info "   - Backup files: ${BACKUP_FILES}"

################################################################################
# 5️⃣ FINAL REPORT
################################################################################

log_info "=========================================="
log_info "📋 MAINTENANCE REPORT"
log_info "=========================================="

log_info "✅ Tasks Completed:"
log_info "   1. Log cleanup: Removed logs older than ${LOG_RETENTION_DAYS} days"
log_info "   2. Data backup: Created ${BACKUP_FILE}"
log_info "   3. Backup cleanup: Removed backups older than ${BACKUP_RETENTION_DAYS} days"
log_info "   4. Statistics collected"

log_info ""
log_info "📌 Next Scheduled Maintenance:"
NEXT_MAINTENANCE=$(date -d '+1 day' '+%Y-%m-%d 02:30:00')
log_info "   Scheduled: ${NEXT_MAINTENANCE}"

log_success "🎉 All maintenance tasks completed successfully!"

################################################################################
# 🔔 NOTES
################################################################################
# 
# 1. Crontab Setup:
#    crontab -e
#    30 2 * * * /workspaces/portfolio-tracker/daily_maintenance.sh >> /tmp/maintenance.log 2>&1
#    # Chạy mỗi ngày lúc 2h30 sáng
#
# 2. Check logs:
#    tail -f /tmp/maintenance.log
#
# 3. Manual run:
#    ./daily_maintenance.sh
#
# 4. Monitor backup:
#    ls -lh /workspaces/portfolio-tracker/backups/
#
################################################################################

# ✅ Script exits naturally with successful exit code (0)

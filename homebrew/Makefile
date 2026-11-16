.SUFFIXES:

ifeq ($(strip $(DEVKITARM)),)
$(error "DEVKITARM no está definido. Instala devkitPro: https://devkitpro.org/wiki/Getting_Started")
endif

TOPDIR ?= $(CURDIR)
include $(DEVKITARM)/3ds_rules

TARGET          := 3ds-wrapped
BUILD           := build
SOURCES         := source source/qrcodegen
INCLUDES        := source source/qrcodegen

APP_TITLE       := 3DS Wrapped
APP_DESCRIPTION := Tu resumen anual de juego
APP_AUTHOR      := P0tzz

WRAPPED_URL     ?= https://p0tzz.github.io/3ds-wrapped/
APP_VERSION     ?= 0.3.1

ARCH     := -march=armv6k -mtune=mpcore -mfloat-abi=hard -mtp=soft
CFLAGS   := -g -Wall -O2 -mword-relocations -ffunction-sections $(ARCH) $(INCLUDE) -D__3DS__ \
            -DWRAPPED_URL=\"$(WRAPPED_URL)\" -DAPP_VERSION=\"$(APP_VERSION)\"
ASFLAGS  := -g $(ARCH)
LDFLAGS   = -specs=3dsx.specs -g $(ARCH) -Wl,-Map,$(notdir $*.map)
LIBS     := -lctru -lm
LIBDIRS  := $(CTRULIB)

ifneq ($(BUILD),$(notdir $(CURDIR)))

export OUTPUT   := $(CURDIR)/$(TARGET)
export TOPDIR   := $(CURDIR)
export VPATH    := $(foreach dir,$(SOURCES),$(CURDIR)/$(dir))
export DEPSDIR  := $(CURDIR)/$(BUILD)

CFILES          := $(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.c)))
CFILES          := $(filter-out qrcodegen-test.c,$(CFILES))

export LD       := $(CC)
export OFILES   := $(CFILES:.c=.o)
export INCLUDE  := $(foreach dir,$(INCLUDES),-I$(CURDIR)/$(dir)) \
                   $(foreach dir,$(LIBDIRS),-I$(dir)/include) \
                   -I$(CURDIR)/$(BUILD)
export LIBPATHS := $(foreach dir,$(LIBDIRS),-L$(dir)/lib)

ifneq (,$(wildcard $(TOPDIR)/icon.png))
export APP_ICON := $(TOPDIR)/icon.png
else
export APP_ICON := $(CTRULIB)/default_icon.png
endif

export _3DSXFLAGS += --smdh=$(CURDIR)/$(TARGET).smdh

.PHONY: all clean

all: $(BUILD)
	@$(MAKE) --no-print-directory -C $(BUILD) -f $(CURDIR)/Makefile

$(BUILD):
	@mkdir -p $@

clean:
	@rm -rf $(BUILD) $(TARGET).3dsx $(TARGET).smdh $(TARGET).elf

else

DEPENDS := $(OFILES:.o=.d)

$(OUTPUT).3dsx: $(OUTPUT).elf $(OUTPUT).smdh
$(OUTPUT).elf: $(OFILES)

-include $(DEPENDS)

endif

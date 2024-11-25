import React, {useEffect, useState} from "react";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import TButton from "../loadable/Button";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import TextsmsIcon from "@mui/icons-material/Textsms";
import ArticleIcon from "@mui/icons-material/Article";
import FolderIcon from "@mui/icons-material/Folder";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { keyframes } from "@mui/system";
import {FormControl, InputLabel, Select} from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import Cookies from "js-cookie";

const isStaff = (window as any).isStaff;

const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const ProjectLinks = (props: any) => {
  const { project, projectLinkList } = props;

  const [editLink, setEditLink] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [editedLink, setEditedLink] = useState("");
  const [editedCategory, setEditedCategory] = useState("");

  const [nameError, setNameError] = useState(false);
  const [linkError, setLinkError] = useState(false);

  const [isAdd, setIsAdd] = useState(false);

  const [projectLinks, setProjectLinks] = useState([]);

  useEffect(() => {
    setProjectLinks(projectLinkList);
  }, [projectLinkList]);

  if (!project) {
    return <></>;
  }

  const handleEditClick = (e: any, projectLink: any) => {
    e.stopPropagation();
    setEditLink(projectLink);
    setEditedName(projectLink.name);
    setEditedLink(projectLink.link);
    setEditedCategory(projectLink.category);
    setNameError(false);
    setLinkError(false);
    setIsAdd(false);
  };

  const handleAddClick = () => {
    setEditLink(null);
    setEditedName("");
    setEditedLink("");
    setEditedCategory("");
    setNameError(false);
    setLinkError(false);
    setIsAdd(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this project link?")) {
      fetch("/project-link/", {
        credentials: "include",
        method: "DELETE",
        body: JSON.stringify({ id }),
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": Cookies.get("csrftoken") as any,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to delete project link");
          }
          setProjectLinks((prevLinks: any) =>
            prevLinks.filter((link: any) => link.id !== id)
          );
          setEditLink(null);
          setEditedName("");
          setEditedLink("");
          setEditedCategory("");
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }
  };

  const handleDeleteClick = (e: any, projectLink: any) => {
    e.stopPropagation();
    handleDelete(projectLink.id);
  };

  const handleSave = () => {
    if (!editedName.trim()) {
      setNameError(true);
      return;
    } else {
      setNameError(false);
    }

    try {
      new URL(editedLink);
      setLinkError(false);
    } catch {
      setLinkError(true);
      return;
    }

    const data = {
      name: editedName,
      link: editedLink,
      category: editedCategory,
    };

    if (editLink) {
      data["id"] = (editLink as any).id;
    } else {
      data["project"] = project.id;
    }

    fetch("/project-link/", {
      credentials: "include",
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRFToken": Cookies.get("csrftoken") as any,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Saved changes:", data);
        // Update projectLinks
        if (editLink) {
          // Update existing link
          setProjectLinks((prevLinks: any) =>
            prevLinks.map((link) => (link.id === data.id ? data : link))
          );
        } else {
          // Add new link
          // @ts-ignore
          setProjectLinks((prevLinks: any) => [...prevLinks, data]);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    setEditLink(null);
    setEditedName("");
    setEditedLink("");
    setEditedCategory("");
    setIsAdd(false);
  };



  const handleCancel = () => {
    setEditLink(null);
    setIsAdd(false);
  };

  return (
    <>
      <Box
        className={"project-link-container"}
        sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}
      >
        {projectLinks.slice(0, 5).map((projectLink: any, index: number) => (
          <Tooltip title={projectLink.name} placement={"top"} key={projectLink.name}>
            <Box sx={{ position: "relative", display: "inline-block" }}>
              <TButton
                color={"secondary"}
                variant={"outlined"}
                onClick={() => window.open(projectLink.link, "_blank")}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  animation: `${fadeIn} 0.1s ease-out`,
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: "forwards",
                  opacity: 0,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                  },
                }}
              >
                {/* Main Icon */}
                {projectLink.category === "DIA" ? (
                  <AccountTreeIcon />
                ) : projectLink.category === "CHA" ? (
                  <TextsmsIcon />
                ) : projectLink.category === "DOC" ? (
                  <ArticleIcon />
                ) : projectLink.category === "REP" ? (
                  <FolderIcon />
                ) : (
                  <LinkOutlinedIcon />
                )}
              </TButton>

              { isStaff &&
                <TButton
                  color="primary"
                  variant="contained"
                  onClick={(e) => handleEditClick(e, projectLink)}
                  sx={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    minWidth: 15,
                    width: 15,
                    height: 15,
                    padding: 0,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0px 2px 4px rgba(0,0,0,0.2)",
                    "& .MuiButton-startIcon": {
                      margin: 0,
                    },
                    "&:hover": {
                      backgroundColor: "rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  <EditIcon style={{ fontSize: "8pt" }} />
                </TButton>
              }
            </Box>
          </Tooltip>
        ))}

        {/* Add Button */}
        {isStaff &&
          <Tooltip title={"Add new project link"} placement={"top"}>
            <TButton
              color={"success"}
              variant={"outlined"}
              onClick={handleAddClick}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: `${fadeIn} 0.1s ease-out`,
                animationDelay: `${projectLinkList.slice(0, 5).length * 0.1}s`,
                animationFillMode: "forwards",
                opacity: 0,
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                },
              }}
            >
              <AddIcon />
            </TButton>
          </Tooltip>
        }
      </Box>

      {/* Edit Modal */}
      <Modal
        open={editLink !== null || isAdd}
        onClose={handleCancel}
        aria-labelledby="edit-project-link-modal"
        aria-describedby="edit-project-link-modal-description"
      >
        <Box
          sx={{
            position: "absolute" as const,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: "8px",
            boxShadow: 24,
            p: 4,
          }}
        >
          <h2 id="edit-project-link-modal">
            {isAdd ? 'Add' : 'Edit'} Project Link</h2>
          <TextField
            label="Name"
            value={editedName}
            onChange={(e) => {
              setEditedName(e.target.value);
              setNameError(e.target.value.trim() === '');
            }}
            error={nameError}
            helperText={nameError ? 'Name is required' : ''}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Link"
            type="url"
            value={editedLink}
            onChange={(e) => {
              setEditedLink(e.target.value);
              try {
                new URL(e.target.value);
                setLinkError(false);
              } catch {
                setLinkError(true);
              }
            }}
            error={linkError}
            helperText={linkError ? 'Valid URL is required' : ''}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              label="Category"
              value={editedCategory}
              onChange={(e) => setEditedCategory(e.target.value)}
            >
              <MenuItem value="DOC">Documentation</MenuItem>
              <MenuItem value="CHA">Chat</MenuItem>
              <MenuItem value="REP">Repository</MenuItem>
              <MenuItem value="DIA">Diagram</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel} sx={{ mr: 1 }}>
              Cancel
            </Button>
            {
              editLink !== null ? (
                <TButton
                  color="error"
                  onClick={(e) => handleDeleteClick(e, editLink)}
                  style={{marginRight: 5}}
                >
                  Delete
                </TButton>
              ) : null
            }
            <Button
              variant="contained"
              onClick={handleSave}
              color={"success"}
              disabled={
                nameError ||
                linkError ||
                editedName.trim() === '' ||
                editedLink.trim() === ''
              }
            >
              Save
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default ProjectLinks;
